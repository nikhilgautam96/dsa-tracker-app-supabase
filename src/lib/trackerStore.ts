import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Entry, SyncState, TrackerVersion } from './types';
import { validateSolutionUrl } from './solutionUrl';

/**
 * Per-user tracker state with a local-first cache:
 *  - versions (≤ 5) and the active version (synced to user_settings)
 *  - per-version entries: solved + solution link, needs-link flag (pre-v2 solves), revisit flag
 *  - notes, shared across versions
 *
 * Every change is applied in memory, persisted to localStorage and queued; queues are pushed to Supabase in
 * batches and retried (reconnect, tab focus, timer), so the app keeps working while Supabase is unreachable.
 * Version create/rename/delete need a connection (they return server ids) and throw a friendly error offline.
 */

interface PendingProgress {
  vid: string;
  pk: string;
  entry: Entry;
  at: string;
}
interface PendingNote {
  note: string;
  at: string;
}
interface CacheShape {
  versions: TrackerVersion[];
  activeVersionId: string | null;
  pendingActive: string | null;
  entries: Record<string, Record<string, Entry>>;
  notes: Record<string, string>;
  pendingProgress: Record<string, PendingProgress>;
  pendingNotes: Record<string, PendingNote>;
}
interface ProgressRow {
  version_id: string;
  problem_key: string;
  solved: boolean;
  solution_url: string | null;
  needs_link: boolean;
  revisit: boolean;
  solved_at: string | null;
}

export class UserFacingError extends Error {}

const PAGE = 1000;
const BATCH = 500;
const RETRY_MS = 30_000;
const NOTE_DEBOUNCE_MS = 800;
const PERMANENT_CODES = new Set(['23514', '23503', '23505', 'P0001', '42501', '22P02']);
const EMPTY: Entry = { solved: false, solutionUrl: null, needsLink: false, revisit: false, solvedAt: null };
const pKey = (vid: string, pk: string) => `${vid}\u0001${pk}`;

export interface ImportSummary {
  linked: number;
  legacy: number;
  skipped: number;
  notes: number;
  revisit: number;
}

export class TrackerStore {
  private readonly client: SupabaseClient;
  private readonly userId: string;
  private readonly cacheKey: string;

  versions: TrackerVersion[] = [];
  activeVersionId: string | null = null;
  private pendingActive: string | null = null;
  private entries = new Map<string, Map<string, Entry>>();
  private notes = new Map<string, string>();
  private pendingProgress = new Map<string, PendingProgress>();
  private pendingNotes = new Map<string, PendingNote>();

  private listeners = new Set<() => void>();
  private version = 0;
  private flushing = false;
  private pulled = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private noteTimer: ReturnType<typeof setTimeout> | null = null;

  syncState: SyncState = 'synced';
  lastError = '';
  /** a change the server refused (e.g. a rule violation); shown once to the user */
  rejection = '';

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
    this.cacheKey = `dsa-tracker:v2:${userId}`;
    this.loadCache();
  }

  // ---------------- subscription ----------------
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = (): number => this.version;
  private emit(): void {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  // ---------------- reads (active version) ----------------
  get ready(): boolean {
    return this.activeVersionId !== null;
  }
  get activeVersion(): TrackerVersion | undefined {
    return this.versions.find((v) => v.id === this.activeVersionId);
  }
  entry(pk: string): Entry {
    return (this.activeVersionId && this.entries.get(this.activeVersionId)?.get(pk)) || EMPTY;
  }
  isSolved = (pk: string): boolean => this.entry(pk).solved;
  note(pk: string): string {
    return this.notes.get(pk) ?? '';
  }
  pendingCount(): number {
    return this.pendingProgress.size + this.pendingNotes.size + (this.pendingActive ? 1 : 0);
  }
  clearRejection(): void {
    this.rejection = '';
    this.emit();
  }

  // ---------------- writes (active version) ----------------
  markSolved(pk: string, rawUrl: string): void {
    const v = validateSolutionUrl(rawUrl);
    if (!v.ok) throw new UserFacingError(v.error);
    const cur = this.entry(pk);
    this.putEntry(pk, { ...cur, solved: true, solutionUrl: v.url, needsLink: false, solvedAt: cur.solved && cur.solvedAt ? cur.solvedAt : new Date().toISOString() });
  }

  /** Untick: keeps the stored link so re-ticking can pre-fill it. */
  markUnsolved(pk: string): void {
    const cur = this.entry(pk);
    if (!cur.solved) return;
    this.putEntry(pk, { ...cur, solved: false, needsLink: false, solvedAt: null });
  }

  setSolutionUrl(pk: string, rawUrl: string): void {
    const v = validateSolutionUrl(rawUrl);
    if (!v.ok) throw new UserFacingError(v.error);
    this.putEntry(pk, { ...this.entry(pk), solutionUrl: v.url, needsLink: false });
  }

  toggleRevisit(pk: string): void {
    const cur = this.entry(pk);
    this.putEntry(pk, { ...cur, revisit: !cur.revisit });
  }

  setNote(pk: string, text: string): void {
    const note = text.slice(0, 10_000);
    if ((this.notes.get(pk) ?? '') === note) return;
    if (note) this.notes.set(pk, note);
    else this.notes.delete(pk);
    this.pendingNotes.set(pk, { note, at: new Date().toISOString() });
    this.saveCache();
    this.emit();
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => void this.flush(), NOTE_DEBOUNCE_MS);
  }

  private putEntry(pk: string, entry: Entry): void {
    const vid = this.activeVersionId;
    if (!vid) throw new UserFacingError('Still loading your tracker — try again in a moment.');
    if (entry.solved && !entry.solutionUrl && !entry.needsLink) {
      throw new UserFacingError('A solution link is required to mark a problem solved.');
    }
    let m = this.entries.get(vid);
    if (!m) this.entries.set(vid, (m = new Map()));
    m.set(pk, entry);
    this.pendingProgress.set(pKey(vid, pk), { vid, pk, entry, at: new Date().toISOString() });
    this.saveCache();
    this.emit();
    void this.flush();
  }

  // ---------------- versions (need a connection) ----------------
  async switchVersion(id: string): Promise<void> {
    if (id === this.activeVersionId || !this.versions.some((v) => v.id === id)) return;
    this.activeVersionId = id;
    this.pendingActive = id;
    this.saveCache();
    this.emit();
    await this.flush();
  }

  async createVersion(name: string): Promise<void> {
    const clean = name.trim();
    if (!clean || clean.length > 40) throw new UserFacingError('Name it in 1–40 characters.');
    if (this.versions.length >= 5) throw new UserFacingError('You can have at most 5 versions. Delete one first.');
    this.requireOnline();
    const { data, error } = await this.client
      .from('tracker_versions')
      .insert({ user_id: this.userId, name: clean })
      .select('id, name, created_at')
      .single();
    if (error) throw this.friendly(error);
    this.versions = [...this.versions, data as TrackerVersion];
    this.entries.set((data as TrackerVersion).id, new Map());
    await this.switchVersion((data as TrackerVersion).id);
  }

  async renameVersion(id: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean || clean.length > 40) throw new UserFacingError('Name it in 1–40 characters.');
    this.requireOnline();
    const { error } = await this.client.from('tracker_versions').update({ name: clean }).eq('id', id);
    if (error) throw this.friendly(error);
    this.versions = this.versions.map((v) => (v.id === id ? { ...v, name: clean } : v));
    this.saveCache();
    this.emit();
  }

  async deleteVersion(id: string): Promise<void> {
    if (this.versions.length <= 1) throw new UserFacingError("You can't delete your only version.");
    this.requireOnline();
    const { data, error } = await this.client.rpc('delete_version', { p_version_id: id });
    if (error) throw this.friendly(error);
    this.versions = this.versions.filter((v) => v.id !== id);
    this.entries.delete(id);
    for (const [k, p] of this.pendingProgress) if (p.vid === id) this.pendingProgress.delete(k);
    if (this.activeVersionId === id) this.activeVersionId = (data as string | null) ?? this.versions[0]?.id ?? null;
    if (this.pendingActive === id) this.pendingActive = null;
    this.saveCache();
    this.emit();
  }

  // ---------------- import / export (active version) ----------------
  exportData(): object {
    const vid = this.activeVersionId;
    const m = (vid && this.entries.get(vid)) || new Map<string, Entry>();
    const solved: string[] = [];
    const links: Record<string, string> = {};
    const needsLink: string[] = [];
    const revisit: string[] = [];
    for (const [pk, e] of m) {
      if (e.solved) solved.push(pk);
      if (e.solutionUrl) links[pk] = e.solutionUrl;
      if (e.solved && e.needsLink) needsLink.push(pk);
      if (e.revisit) revisit.push(pk);
    }
    return {
      version: 2,
      exported: new Date().toISOString(),
      trackerVersion: this.activeVersion?.name ?? null,
      solved: solved.sort(),
      links,
      needsLink: needsLink.sort(),
      revisit: revisit.sort(),
      notes: Object.fromEntries(this.notes),
    };
  }

  /** Accepts v2 exports, the owner file (solved + links) and v1 exports (solved / overrides). */
  async importData(json: unknown, knownKeys: Set<string>): Promise<ImportSummary> {
    const j = (json ?? {}) as {
      solved?: unknown;
      overrides?: Record<string, unknown>;
      links?: Record<string, unknown>;
      revisit?: unknown;
      notes?: Record<string, unknown>;
    };
    const solved = new Set<string>();
    if (Array.isArray(j.solved)) j.solved.forEach((k) => typeof k === 'string' && solved.add(k));
    if (j.overrides) Object.entries(j.overrides).forEach(([k, v]) => v === true && solved.add(k));
    const links = new Map<string, string>();
    if (j.links) for (const [k, v] of Object.entries(j.links)) if (typeof v === 'string' && validateSolutionUrl(v).ok) links.set(k, v.trim());

    const summary: ImportSummary = { linked: 0, legacy: 0, skipped: 0, notes: 0, revisit: 0 };
    const legacy: string[] = [];
    for (const pk of new Set([...solved, ...links.keys()])) {
      if (!knownKeys.has(pk)) {
        summary.skipped++;
        continue;
      }
      const url = links.get(pk);
      const cur = this.entry(pk);
      if (url) {
        if (cur.solved && cur.solutionUrl) continue;
        if (solved.has(pk) || cur.solved) {
          this.markSolved(pk, url);
          summary.linked++;
        } else if (!cur.solutionUrl) {
          this.setSolutionUrl(pk, url);
        }
      } else if (!cur.solved) {
        legacy.push(pk);
      }
    }
    if (Array.isArray(j.revisit)) {
      for (const pk of j.revisit) {
        if (typeof pk === 'string' && knownKeys.has(pk) && !this.entry(pk).revisit) {
          this.toggleRevisit(pk);
          summary.revisit++;
        }
      }
    }
    if (j.notes) {
      for (const [pk, v] of Object.entries(j.notes)) {
        if (typeof v === 'string' && v.trim() && knownKeys.has(pk) && !this.note(pk)) {
          this.setNote(pk, v);
          summary.notes++;
        }
      }
    }
    if (legacy.length) {
      // Solved without a link (pre-v2 data): only the server may flag these as "needs link".
      this.requireOnline();
      const { data, error } = await this.client.rpc('import_legacy_solved', { p_version_id: this.activeVersionId, p_keys: legacy });
      if (error) throw this.friendly(error);
      summary.legacy = Number(data ?? 0);
      await this.pull();
    }
    return summary;
  }

  // ---------------- server sync ----------------
  async pull(): Promise<void> {
    this.setSync('syncing');
    try {
      const { data: active, error: setupErr } = await this.client.rpc('ensure_tracker_setup');
      if (setupErr) throw setupErr;

      const { data: versions, error: vErr } = await this.client
        .from('tracker_versions')
        .select('id, name, created_at')
        .order('created_at')
        .order('id');
      if (vErr) throw vErr;

      const rows: ProgressRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await this.client
          .from('progress')
          .select('version_id, problem_key, solved, solution_url, needs_link, revisit, solved_at')
          .eq('user_id', this.userId)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data as ProgressRow[]));
        if (!data || data.length < PAGE) break;
      }
      const notes: { problem_key: string; note: string }[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await this.client.from('problem_notes').select('problem_key, note').eq('user_id', this.userId).range(from, from + PAGE - 1);
        if (error) throw error;
        notes.push(...(data as { problem_key: string; note: string }[]));
        if (!data || data.length < PAGE) break;
      }

      this.versions = versions as TrackerVersion[];
      const entries = new Map<string, Map<string, Entry>>(this.versions.map((v) => [v.id, new Map()]));
      for (const r of rows) {
        entries.get(r.version_id)?.set(r.problem_key, {
          solved: r.solved,
          solutionUrl: r.solution_url,
          needsLink: r.needs_link,
          revisit: r.revisit,
          solvedAt: r.solved_at,
        });
      }
      // unsent local changes win over the server copy (drop ones for versions that no longer exist)
      for (const [k, p] of this.pendingProgress) {
        const m = entries.get(p.vid);
        if (m) m.set(p.pk, p.entry);
        else this.pendingProgress.delete(k);
      }
      this.entries = entries;
      this.notes = new Map(notes.map((n) => [n.problem_key, n.note]));
      for (const [pk, p] of this.pendingNotes) {
        if (p.note) this.notes.set(pk, p.note);
        else this.notes.delete(pk);
      }
      const localActive = this.pendingActive && entries.has(this.pendingActive) ? this.pendingActive : null;
      if (!localActive) this.pendingActive = null;
      this.activeVersionId = localActive ?? (active as string);
      this.pulled = true;
      this.lastError = '';
      this.saveCache();
      this.emit();
      await this.flush();
      if (!this.pendingCount()) this.setSync('synced');
    } catch (e) {
      this.fail(e);
    }
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (!this.pendingCount()) {
      if (this.syncState === 'syncing') this.setSync('synced');
      return;
    }
    if (!navigator.onLine) {
      this.setSync('offline');
      return;
    }
    this.flushing = true;
    this.setSync('syncing');
    try {
      await this.flushProgress();
      await this.flushNotes();
      await this.flushActive();
      this.lastError = '';
      this.saveCache();
      this.setSync(this.pendingCount() ? 'syncing' : 'synced');
    } catch (e) {
      this.fail(e);
    } finally {
      this.flushing = false;
    }
    if (this.pendingCount() && this.syncState === 'syncing') void this.flush();
  }

  private progressRow(p: PendingProgress) {
    // needs_link is deliberately omitted: only the server sets it (pre-v2 rows); adding a link clears it there.
    return {
      user_id: this.userId,
      version_id: p.vid,
      problem_key: p.pk,
      solved: p.entry.solved,
      solution_url: p.entry.solutionUrl,
      revisit: p.entry.revisit,
      solved_at: p.entry.solvedAt,
      updated_at: p.at,
    };
  }

  private async flushProgress(): Promise<void> {
    const batch = [...this.pendingProgress.entries()];
    for (let i = 0; i < batch.length; i += BATCH) {
      const chunk = batch.slice(i, i + BATCH);
      const { error } = await this.client.from('progress').upsert(chunk.map(([, p]) => this.progressRow(p)), { onConflict: 'user_id,version_id,problem_key' });
      if (!error) {
        for (const [k, p] of chunk) if (this.pendingProgress.get(k)?.at === p.at) this.pendingProgress.delete(k);
        continue;
      }
      if (!PERMANENT_CODES.has(error.code)) throw error;
      // A rule rejected something in the batch: send rows one by one, drop the rejected ones, then resync.
      let rejected = 0;
      for (const [k, p] of chunk) {
        const { error: e1 } = await this.client.from('progress').upsert(this.progressRow(p), { onConflict: 'user_id,version_id,problem_key' });
        if (e1 && !PERMANENT_CODES.has(e1.code)) throw e1;
        if (e1) rejected++;
        if (this.pendingProgress.get(k)?.at === p.at) this.pendingProgress.delete(k);
      }
      if (rejected) {
        this.rejection = `${rejected} change${rejected > 1 ? 's were' : ' was'} refused by the server and undone (${error.message}).`;
        setTimeout(() => void this.pull(), 0);
      }
    }
  }

  private async flushNotes(): Promise<void> {
    const batch = [...this.pendingNotes.entries()];
    if (!batch.length) return;
    const upserts = batch.filter(([, p]) => p.note);
    const deletes = batch.filter(([, p]) => !p.note).map(([pk]) => pk);
    if (upserts.length) {
      const { error } = await this.client
        .from('problem_notes')
        .upsert(upserts.map(([pk, p]) => ({ user_id: this.userId, problem_key: pk, note: p.note, updated_at: p.at })), { onConflict: 'user_id,problem_key' });
      if (error) throw error;
    }
    if (deletes.length) {
      const { error } = await this.client.from('problem_notes').delete().eq('user_id', this.userId).in('problem_key', deletes);
      if (error) throw error;
    }
    for (const [pk, p] of batch) if (this.pendingNotes.get(pk)?.at === p.at) this.pendingNotes.delete(pk);
  }

  private async flushActive(): Promise<void> {
    const id = this.pendingActive;
    if (!id) return;
    const { error } = await this.client
      .from('user_settings')
      .upsert({ user_id: this.userId, active_version_id: id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error && !PERMANENT_CODES.has(error.code)) throw error;
    if (this.pendingActive === id) this.pendingActive = null;
  }

  private requireOnline(): void {
    if (!navigator.onLine) throw new UserFacingError("You're offline — reconnect to manage versions or import.");
  }

  private friendly(e: PostgrestError): UserFacingError {
    if (e.hint === 'version_limit') return new UserFacingError('You can have at most 5 versions. Delete one first.');
    if (e.hint === 'last_version') return new UserFacingError("You can't delete your only version.");
    if (e.code === '23505') return new UserFacingError('You already have a version with that name.');
    if (e.code === '42501') return new UserFacingError("You don't have access to this tracker.");
    return new UserFacingError(e.message || 'Something went wrong. Try again.');
  }

  private fail(e: unknown): void {
    this.lastError = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    const offline = !navigator.onLine || /fetch|network|Failed|Load failed/i.test(this.lastError);
    this.setSync(offline ? 'offline' : 'error');
    if (!this.retryTimer) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        void (this.pulled ? this.flush() : this.pull());
      }, RETRY_MS);
    }
  }

  private setSync(s: SyncState): void {
    if (this.syncState === s) return;
    this.syncState = s;
    this.emit();
  }

  dispose(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.retryTimer = this.noteTimer = null;
  }

  // ---------------- local cache ----------------
  private loadCache(): void {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return;
      const c = JSON.parse(raw) as CacheShape;
      this.versions = c.versions ?? [];
      this.activeVersionId = c.activeVersionId ?? null;
      this.pendingActive = c.pendingActive ?? null;
      this.entries = new Map(Object.entries(c.entries ?? {}).map(([vid, m]) => [vid, new Map(Object.entries(m))]));
      this.notes = new Map(Object.entries(c.notes ?? {}));
      this.pendingProgress = new Map(Object.entries(c.pendingProgress ?? {}));
      this.pendingNotes = new Map(Object.entries(c.pendingNotes ?? {}));
    } catch {
      /* corrupt cache: start empty; the server pull repopulates */
    }
  }

  private saveCache(): void {
    const c: CacheShape = {
      versions: this.versions,
      activeVersionId: this.activeVersionId,
      pendingActive: this.pendingActive,
      entries: Object.fromEntries([...this.entries].map(([vid, m]) => [vid, Object.fromEntries(m)])),
      notes: Object.fromEntries(this.notes),
      pendingProgress: Object.fromEntries(this.pendingProgress),
      pendingNotes: Object.fromEntries(this.pendingNotes),
    };
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(c));
    } catch {
      /* storage full / disabled: the server copy remains the source of truth */
    }
  }
}
