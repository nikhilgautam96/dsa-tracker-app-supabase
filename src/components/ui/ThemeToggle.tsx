import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, currentTheme, subscribeTheme } from '../../lib/theme';

/** Light/dark switch (same model as the portfolio). Icons swap with the `dark:` variant, so first paint is right. */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme);
  return (
    <button
      type="button"
      onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Dark theme"
      aria-pressed={theme === 'dark'}
      title="Toggle dark theme"
      className={`btn btn-ghost ${withLabel ? 'w-full justify-start px-2' : 'size-9 px-0'}`}
    >
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
      {withLabel && <span className="font-normal text-fg-muted">{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>}
    </button>
  );
}
