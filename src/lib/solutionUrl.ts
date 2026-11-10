import type { Problem } from './types';

export const MAX_URL_LENGTH = 500;

/** Same rule as the database check: an absolute https:// URL without spaces, ≤ 500 chars. */
export function validateSolutionUrl(raw: string, problem?: Problem): { ok: true; url: string } | { ok: false; error: string } {
  const url = raw.trim();
  if (!url) return { ok: false, error: 'Paste the link to your solution.' };
  if (url.length > MAX_URL_LENGTH) return { ok: false, error: `Keep it under ${MAX_URL_LENGTH} characters.` };
  if (/\s/.test(url)) return { ok: false, error: "Links can't contain spaces." };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'That doesn’t look like a link. It should start with https://' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, error: 'Use an https:// link.' };
  if (!parsed.hostname.includes('.')) return { ok: false, error: 'That link is missing a domain.' };
  if (problem && url === solutionTemplate(problem)) {
    return { ok: false, error: 'Add your submission id to the end of the link.' };
  }
  return { ok: true, url };
}

/** A starting point for the link field, e.g. a LeetCode problem's submissions page. Never accepted unchanged. */
export function solutionTemplate(p: Problem): string {
  if (p.platform === 'LeetCode' && p.pk.startsWith('lc:')) return `https://leetcode.com/problems/${p.pk.slice(3)}/submissions/`;
  return '';
}

/** Short display form: host + trimmed path. */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const tail = path.length > 28 ? `…${path.slice(-26)}` : path;
    return u.hostname.replace(/^www\./, '') + tail;
  } catch {
    return url;
  }
}
