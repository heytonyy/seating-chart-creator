export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'seating-chart-creator:theme';

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Returns the user's saved override, or null if they've never toggled. */
export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Resolve the theme to use on initial load: stored override wins, else system. */
export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}
