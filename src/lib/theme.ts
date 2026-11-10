/**
 * Theme model (mirrors the portfolio):
 * - Light is the default for every first visit, regardless of OS preference.
 * - Dark applies only after the user chooses it; the choice persists in localStorage and is applied
 *   before first paint by the inline script in index.html (no flash).
 */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
export const THEME_COLORS: Record<Theme, string> = { light: '#f7f6f4', dark: '#1f1e1d' };
const EVENT = 'themechange';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable: theme still applies for this page */
  }
  window.dispatchEvent(new Event(EVENT));
}
