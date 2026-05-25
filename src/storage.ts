import type { AppState, Student } from './types';

const STORAGE_KEY = 'seating-chart-creator:v1';

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return migrateState(parsed);
  } catch {
    return null;
  }
}

function migrateState(state: AppState): AppState {
  let mutated = false;
  const periods = state.periods.map((p) => {
    const roster = p.roster.map((s) => {
      const legacy = s as Student & { name?: string };
      if (typeof legacy.firstName === 'string' && typeof legacy.lastName === 'string') return s;
      mutated = true;
      return splitLegacyName(legacy.id, legacy.name ?? '');
    });
    return { ...p, roster };
  });
  return mutated ? { ...state, periods } : state;
}

function splitLegacyName(id: string, name: string): Student {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(' ');
  if (idx < 0) return { id, firstName: trimmed, lastName: '' };
  return { id, firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1).trim() };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or unavailable — fail silently for MVP.
  }
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
