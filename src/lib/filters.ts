import type { Filters, Problem } from './types';

export const SOURCE_GROUPS = ['Blind 75', 'Grind 75', 'Grind 169', 'LC Design', 'Roadmap', 'Pepcoding L3'] as const;
export const LEVELS = ['All', 'Easy', 'Medium', 'Hard'] as const;
export const STATUSES = ['All', 'Unsolved', 'Solved'] as const;

/** "Roadmap P3" → "Roadmap" */
export const srcGroup = (s: string): string => (s.startsWith('Roadmap') ? 'Roadmap' : s);

export const emptyFilters = (): Filters => ({
  cat: new Set(),
  src: new Set(),
  plat: new Set(),
  status: 'All',
  level: 'All',
  q: '',
});

export type FacetSkip = 'cat' | 'src' | 'plat' | null;

/**
 * Does a problem pass the filters? `skip` ignores one facet so its pills can show
 * how many results each option would give with all the *other* filters applied.
 */
export function matches(p: Problem, f: Filters, isSolved: (pk: string) => boolean, skip: FacetSkip = null): boolean {
  if (skip !== 'cat' && f.cat.size && !f.cat.has(p.cat)) return false;
  if (skip !== 'src' && f.src.size && !p.sources.some((s) => f.src.has(srcGroup(s)))) return false;
  if (skip !== 'plat' && f.plat.size && !f.plat.has(p.platform)) return false;
  if (f.status === 'Solved' && !isSolved(p.pk)) return false;
  if (f.status === 'Unsolved' && isSolved(p.pk)) return false;
  if (f.level !== 'All' && p.level !== f.level) return false;
  if (f.q) {
    const hay = [p.title, p.num ?? '', p.platform, ...p.tags, ...p.notes, ...p.videos.map((v) => v.t)].join(' ').toLowerCase();
    if (!f.q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Platforms ordered by frequency, with the pseudo-platforms last. */
export function platformOrder(items: Problem[]): string[] {
  const c = new Map<string, number>();
  items.forEach((p) => c.set(p.platform, (c.get(p.platform) ?? 0) + 1));
  const tail = new Set(['Concept', 'Systems exercise', 'Search']);
  return [...c.keys()].sort((a, b) => Number(tail.has(a)) - Number(tail.has(b)) || c.get(b)! - c.get(a)!);
}
