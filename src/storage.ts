import type { AppState, Student } from './types';

const STORAGE_KEY = 'seating-chart-creator:v2';
/** Legacy key written by Stories 1 & 2. We read it once for migration then leave it. */
const LEGACY_KEY = 'seating-chart-creator:v1';

export type SaveResult = 'ok' | 'quota';

export function loadState(): AppState | null {
  try {
    // Try current key first; fall back to legacy key for seamless upgrade.
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
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
    // ── Story 1: split legacy "name" field ──────────────────────────────
    const roster = p.roster.map((s) => {
      const legacy = s as Student & { name?: string };
      let next = s;

      if (typeof legacy.firstName !== 'string' || typeof legacy.lastName !== 'string') {
        mutated = true;
        next = splitLegacyName(legacy.id, legacy.name ?? '');
      }

      // ── Story 2 fields ──────────────────────────────────────────────
      if ((next as Student & { photoDataUrl?: string }).photoDataUrl === undefined) {
        // already optional — nothing needed
      }

      // ── Story 3 fields ──────────────────────────────────────────────
      const s3 = next as Partial<Student>;
      if (!Array.isArray(s3.accommodations) || typeof s3.notes !== 'string') {
        mutated = true;
        next = {
          ...next,
          accommodations: Array.isArray(s3.accommodations) ? s3.accommodations : [],
          notes: typeof s3.notes === 'string' ? s3.notes : '',
        };
      }

      return next;
    });

    // ── Story 2 period fields ────────────────────────────────────────
    const needsP2 = p.teacherName === undefined || p.roomNumber === undefined || p.subNotes === undefined;
    if (needsP2) mutated = true;

    // ── Story 3 period fields ────────────────────────────────────────
    const needsP3 = !Array.isArray((p as unknown as { pairFlags?: unknown }).pairFlags);
    if (needsP3) mutated = true;

    return {
      ...p,
      roster,
      teacherName: p.teacherName ?? '',
      roomNumber: p.roomNumber ?? '',
      subNotes: p.subNotes ?? '',
      pairFlags: needsP3 ? [] : p.pairFlags,
    };
  });

  // ── AppState fields ────────────────────────────────────────────────
  const viewMode = (state.viewMode as 'editor' | 'sub' | undefined) ?? 'editor';
  const photosEnabled = (state.photosEnabled as boolean | undefined) ?? true;
  if (state.viewMode === undefined || state.photosEnabled === undefined) mutated = true;

  return mutated ? { ...state, periods, viewMode, photosEnabled } : { ...state, periods };
}

function splitLegacyName(id: string, name: string): Student {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(' ');
  const [firstName, lastName] =
    idx < 0 ? [trimmed, ''] : [trimmed.slice(0, idx), trimmed.slice(idx + 1).trim()];
  return { id, firstName, lastName, accommodations: [], notes: '' };
}

export function saveState(state: AppState): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return 'ok';
  } catch {
    return 'quota';
  }
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
