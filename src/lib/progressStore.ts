import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncState } from './types';

/**
 * Per-user progress with a local-first cache.
 *
 * - Every toggle is applied to the in-memory map, persisted to localStorage, and queued as "pending".
 * - Pending changes are pushed to Supabase in batches; on failure they stay queued and are retried
 *   (on reconnect, on tab focus, and on a timer), so the app keeps working while Supabase is down or paused.
 * - On load, server rows are merged in, except for keys that still have an unsent local change.
 */

interface PendingChange {
  solved: boolean;
  /** ISO timestamp of the local change */
  at: string;
}

interface CacheShape {
  solved: Record<string, boolean>;
  pending: Record<string, PendingChange>;
}

interface ServerRow {
  problem_key: string;
  solved: boolean;
}

const PAGE_SIZE = 1000;
const UPSERT_BATCH = 500;
const RETRY_MS = 30_000;
const cacheKey = (userId: string) => `dsa-tracker:progress:${userId}`;

export class ProgressStore {
  private solved = new Map<string, boolean>();
  private pending = new Map<string, PendingChange>();
  private listeners = new Set<() => void>();
  private flushing = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private version = 0;
  private pulled = false;

  syncState: SyncState = 'synced';
  lastError = '';

  private readonly client: SupabaseClient;
  private readonly userId: string;

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
    this.loadCache();
  }

  // ---------- subscription (for useSyncExternalStore) ----------
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = (): number => this.version;

  private emit(): void {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  // ---------- reads ----------
  isSolved(pk: string): boolean {
    return this.solved.get(pk) === true;
  }

  pendingCount(): number {
    return this.pending.size;
  }

  solvedKeys(): string[] {
    return [...this.solved].filter(([, v]) => v).map(([k]) => k).sort();
  }

  // ---------- writes ----------
  setSolved(pk: string, value: boolean): void {
    this.applyLocal([[pk, value]]);
  }

  /** Bulk import (e.g. owner's auto-detected solved list, or an exported JSON file). */
  importSolved(keys: string[]): number {
    const changes = keys.filter((k) => !this.isSolved(k)).map((k): [string, boolean] => [k, true]);
    this.applyLocal(changes);
    return changes.length;
  }

  private applyLocal(changes: [string, boolean][]): void {
    if (!changes.length) return;
    const at = new Date().toISOString();
    for (const [pk, value] of changes) {
      this.solved.set(pk, value);
      this.pending.set(pk, { solved: value, at });
    }
    this.saveCache();
    this.emit();
    void this.flush();
  }

  // ---------- server sync ----------
  /** Pull all rows for this user and merge them with local state. */
  async pull(): Promise<void> {
    this.setSync('syncing');
    try {
      const rows: ServerRow[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await this.client
          .from('progress')
          .select('problem_key, solved')
          .eq('user_id', this.userId)
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data as ServerRow[]));
        if (!data || data.length < PAGE_SIZE) break;
      }
      const server = new Map(rows.map((r) => [r.problem_key, r.solved]));
      const next = new Map<string, boolean>();
      server.forEach((v, k) => next.set(k, v));
      // unsent local changes win over the server copy
      this.pending.forEach((p, k) => next.set(k, p.solved));
      this.solved = next;
      this.pulled = true;
      this.saveCache();
      this.emit();
      await this.flush();
      if (!this.pending.size) this.setSync('synced');
    } catch (e) {
      this.fail(e);
    }
  }

  /** Push queued changes. Safe to call often; concurrent calls are coalesced. */
  async flush(): Promise<void> {
    if (this.flushing || !this.pending.size) {
      if (!this.pending.size && this.syncState !== 'offline' && this.syncState !== 'error') this.setSync('synced');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setSync('offline');
      return;
    }
    this.flushing = true;
    this.setSync('syncing');
    try {
      const batch = [...this.pending.entries()];
      for (let i = 0; i < batch.length; i += UPSERT_BATCH) {
        const chunk = batch.slice(i, i + UPSERT_BATCH);
        const { error } = await this.client.from('progress').upsert(
          chunk.map(([problem_key, p]) => ({
            user_id: this.userId,
            problem_key,
            solved: p.solved,
            updated_at: p.at,
          })),
          { onConflict: 'user_id,problem_key' },
        );
        if (error) throw error;
        // drop only the entries that did not change again while the request was in flight
        for (const [k, p] of chunk) {
          if (this.pending.get(k)?.at === p.at) this.pending.delete(k);
        }
      }
      this.saveCache();
      this.lastError = '';
      this.setSync(this.pending.size ? 'syncing' : 'synced');
    } catch (e) {
      this.fail(e);
    } finally {
      this.flushing = false;
    }
    if (this.pending.size && this.syncState === 'syncing') void this.flush();
  }

  private fail(e: unknown): void {
    this.lastError = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    const offline = (typeof navigator !== 'undefined' && !navigator.onLine) || /fetch|network|Failed/i.test(this.lastError);
    this.setSync(offline ? 'offline' : 'error');
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void (this.pulled ? this.flush() : this.pull());
    }, RETRY_MS);
  }

  private setSync(s: SyncState): void {
    if (this.syncState === s) return;
    this.syncState = s;
    this.emit();
  }

  /** Stop background retries (listeners are owned by their subscribers). */
  dispose(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  // ---------- local cache ----------
  private loadCache(): void {
    try {
      const raw = localStorage.getItem(cacheKey(this.userId));
      if (!raw) return;
      const c = JSON.parse(raw) as CacheShape;
      this.solved = new Map(Object.entries(c.solved ?? {}));
      this.pending = new Map(Object.entries(c.pending ?? {}));
    } catch {
      /* corrupt cache: start empty, server pull will repopulate */
    }
  }

  private saveCache(): void {
    const c: CacheShape = { solved: Object.fromEntries(this.solved), pending: Object.fromEntries(this.pending) };
    try {
      localStorage.setItem(cacheKey(this.userId), JSON.stringify(c));
    } catch {
      /* storage full / disabled: server copy remains the source of truth */
    }
  }
}
