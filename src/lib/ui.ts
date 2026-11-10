/** Shared UI helpers (kept out of component files so Fast Refresh works). */
export const LEVEL_TEXT: Record<string, string> = { Easy: 'text-easy', Medium: 'text-medium', Hard: 'text-hard' };
export const LEVEL_DOT: Record<string, string> = { Easy: 'bg-easy', Medium: 'bg-medium', Hard: 'bg-hard' };

export function toggleSet<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}
