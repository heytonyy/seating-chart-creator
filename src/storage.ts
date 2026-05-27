import type { AppState, Student } from './types';

const STORAGE_KEY = 'seating-chart-creator:v1';

export type SaveResult = 'ok' | 'quota';

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

  // --- Story 1 migration: split legacy "name" field into firstName/lastName ---
  const periods = state.periods.map((p) => {
    const roster = p.roster.map((s) => {
      const legacy = s as Student & { name?: string };
      if (typeof legacy.firstName === 'string' && typeof legacy.lastName === 'string') return s;
      mutated = true;
      return splitLegacyName(legacy.id, legacy.name ?? '');
    });

    // --- Story 2 migration: default new Period fields ---
    const needsPeriodMigration =
      p.teacherName === undefined ||
      p.roomNumber === undefined ||
      p.subNotes === undefined;
    if (needsPeriodMigration) mutated = true;

    return {
      ...p,
      roster,
      teacherName: p.teacherName ?? '',
      roomNumber: p.roomNumber ?? '',
      subNotes: p.subNotes ?? '',
    };
  });

  // --- Story 2 migration: default new AppState fields ---
  const needsAppMigration =
    (state as AppState & { viewMode?: string }).viewMode === undefined ||
    (state as AppState & { photosEnabled?: boolean }).photosEnabled === undefined;
  if (needsAppMigration) mutated = true;

  const viewMode = (state.viewMode as 'editor' | 'sub' | undefined) ?? 'editor';
  const photosEnabled = (state.photosEnabled as boolean | undefined) ?? true;

  return mutated
    ? { ...state, periods, viewMode, photosEnabled }
    : { ...state, periods };
}

function splitLegacyName(id: string, name: string): Student {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(' ');
  if (idx < 0) return { id, firstName: trimmed, lastName: '' };
  return { id, firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1).trim() };
}

export function saveState(state: AppState): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return 'ok';
  } catch {
    // Most likely a QuotaExceededError — photos are the likely culprit.
    return 'quota';
  }
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
