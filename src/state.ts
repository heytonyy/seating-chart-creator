import type { AppState, Period } from './types';
import { genId } from './storage';
import { PRESETS, type PresetKey } from './layouts';

export function newPeriod(name: string, presetKey: PresetKey = 'rows'): Period {
  const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];
  return {
    id: genId('period'),
    name,
    layout: preset.build(),
    roster: [],
    assignments: {},
    undoSnapshot: null,
    updatedAt: Date.now(),
    teacherName: '',
    roomNumber: '',
    subNotes: '',
    pairFlags: [],
  };
}

export function emptyState(): AppState {
  const first = newPeriod('Period 1', 'rows');
  return {
    periods: [first],
    activePeriodId: first.id,
    viewMode: 'editor',
    photosEnabled: true,
  };
}

export function findPeriod(state: AppState): Period | null {
  if (!state.activePeriodId) return null;
  return state.periods.find((p) => p.id === state.activePeriodId) ?? null;
}

export function updatePeriod(state: AppState, periodId: string, mut: (p: Period) => Period): AppState {
  return {
    ...state,
    periods: state.periods.map((p) => (p.id === periodId ? { ...mut(p), updatedAt: Date.now() } : p)),
  };
}

/** Shuffle assignments: randomly assign roster students to available seats. */
export function shuffleAssignments(period: Period): Record<string, string> {
  const seatIds = period.layout.seats.map((s) => s.id);
  const students = [...period.roster];
  // Fisher-Yates
  for (let i = students.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [students[i], students[j]] = [students[j], students[i]];
  }
  const next: Record<string, string> = {};
  const n = Math.min(seatIds.length, students.length);
  for (let i = 0; i < n; i++) {
    next[seatIds[i]] = students[i].id;
  }
  return next;
}

export interface ParsedStudent {
  firstName: string;
  lastName: string;
}

/**
 * Parse roster text. Each non-blank line becomes one student.
 * If the line contains a comma or tab, split on that to separate first/last.
 * Otherwise split on the first space ("John von Neumann" → "John" / "von Neumann").
 */
export function parseRosterText(text: string): ParsedStudent[] {
  const out: ParsedStudent[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parseRosterLine(line);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseRosterLine(line: string): ParsedStudent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (/[,\t]/.test(trimmed)) {
    const parts = trimmed.split(/[,\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).filter(Boolean).join(' ');
    if (!firstName && !lastName) return null;
    return { firstName, lastName };
  }

  const idx = trimmed.indexOf(' ');
  if (idx < 0) return { firstName: trimmed, lastName: '' };
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1).trim(),
  };
}

export function fullName(s: { firstName: string; lastName: string }): string {
  return s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;
}

export function studentBySeat(period: Period): Map<string, string> {
  // Reverse map: studentId -> seatId
  const m = new Map<string, string>();
  for (const [seatId, studentId] of Object.entries(period.assignments)) {
    m.set(studentId, seatId);
  }
  return m;
}
