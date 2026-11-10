import type { Entry, Filters, Level, Problem } from './types';

export const SOURCE_GROUPS = ['Blind 75', 'Grind 75', 'Grind 169', 'LC Design', 'Roadmap', 'Pepcoding L3'] as const;
export const LEVELS: readonly Level[] = ['Easy', 'Medium', 'Hard'];
export const STATUSES = ['All', 'Unsolved', 'Solved'] as const;

/** Short labels for source tags in rows. */
export const SOURCE_SHORT: Record<string, string> = {
  'Blind 75': 'B75',
  'Grind 75': 'G75',
  'Grind 169': 'G169',
  'LC Design': 'Design',
  Roadmap: 'Roadmap',
  'Pepcoding L3': 'Pep L3',
};

/** "Roadmap P3" → "Roadmap" */
export const srcGroup = (s: string): string => (s.startsWith('Roadmap') ? 'Roadmap' : s);

export const emptyFilters = (): Filters => ({
  cat: new Set(),
  src: new Set(),
  plat: new Set(),
  level: new Set(),
  status: 'All',
  revisit: false,
  missingLink: false,
  q: '',
});

export const activeFilterCount = (f: Filters): number =>
  f.src.size + f.plat.size + f.level.size + (f.status !== 'All' ? 1 : 0) + (f.revisit ? 1 : 0) + (f.missingLink ? 1 : 0);

export type FacetSkip = 'cat' | 'src' | 'plat' | null;

/**
 * Does a problem pass the filters? `skip` ignores one facet so its options can show how many results each
 * would give with all the *other* filters applied.
 */
export function matches(p: Problem, f: Filters, entry: (pk: string) => Entry, skip: FacetSkip = null): boolean {
  if (skip !== 'cat' && f.cat.size && !f.cat.has(p.cat)) return false;
  if (skip !== 'src' && f.src.size && !p.sources.some((s) => f.src.has(srcGroup(s)))) return false;
  if (skip !== 'plat' && f.plat.size && !f.plat.has(p.platform)) return false;
  if (f.level.size && !f.level.has(p.level as Level)) return false;
  if (f.status !== 'All' || f.revisit || f.missingLink) {
    const e = entry(p.pk);
    if (f.status === 'Solved' && !e.solved) return false;
    if (f.status === 'Unsolved' && e.solved) return false;
    if (f.revisit && !e.revisit) return false;
    if (f.missingLink && !(e.solved && e.needsLink)) return false;
  }
  if (f.q) {
    const hay = [p.title, p.num ?? '', p.platform, p.cat, ...p.tags, ...p.notes, ...p.videos.map((v) => v.t)].join(' ').toLowerCase();
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
