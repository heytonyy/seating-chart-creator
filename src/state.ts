import type { AppState, Period } from './types';
import { genId } from './storage';
import { PRESETS, type PresetKey } from './layouts';
import { buildAdjacencyMap } from './adjacency';

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

/** Max random retries before falling back to backtracking (PRD v4 §4.7). */
const MAX_RANDOM_ATTEMPTS = 200;

/**
 * Build a symmetric studentId → set of forbidden partner ids, restricted to the
 * pairs that are actionable: both students present in the roster, and not a
 * self-pair. Pairs referencing a missing student are silently ignored (§4.9).
 */
function buildForbiddenMap(period: Period): Map<string, Set<string>> {
  const rosterIds = new Set(period.roster.map((s) => s.id));
  const forbidden = new Map<string, Set<string>>();
  for (const flag of period.pairFlags ?? []) {
    const { studentA, studentB } = flag;
    if (studentA === studentB) continue;
    if (!rosterIds.has(studentA) || !rosterIds.has(studentB)) continue;
    if (!forbidden.has(studentA)) forbidden.set(studentA, new Set());
    if (!forbidden.has(studentB)) forbidden.set(studentB, new Set());
    forbidden.get(studentA)!.add(studentB);
    forbidden.get(studentB)!.add(studentA);
  }
  return forbidden;
}

/** True when no two adjacent seats hold a forbidden pair. */
function respects(
  assignments: Record<string, string>,
  adjacency: Map<string, Set<string>>,
  forbidden: Map<string, Set<string>>,
): boolean {
  if (forbidden.size === 0) return true;
  for (const [seatId, studentId] of Object.entries(assignments)) {
    const banned = forbidden.get(studentId);
    if (!banned) continue;
    const neighbors = adjacency.get(seatId);
    if (!neighbors) continue;
    for (const neighborSeat of neighbors) {
      const other = assignments[neighborSeat];
      if (other && banned.has(other)) return false;
    }
  }
  return true;
}

/**
 * Phase 2: backtracking placement. Seats students one at a time, skipping any
 * seat that would put a student adjacent to an already-placed forbidden
 * partner. Returns an assignment map, or null if no valid arrangement exists.
 */
function backtrack(
  seatIds: string[],
  studentIds: string[],
  adjacency: Map<string, Set<string>>,
  forbidden: Map<string, Set<string>>,
): Record<string, string> | null {
  const assignments: Record<string, string> = {};
  const usedSeats = new Set<string>();

  function conflicts(seatId: string, studentId: string): boolean {
    const banned = forbidden.get(studentId);
    if (!banned) return false;
    const neighbors = adjacency.get(seatId);
    if (!neighbors) return false;
    for (const neighborSeat of neighbors) {
      const other = assignments[neighborSeat];
      if (other && banned.has(other)) return true;
    }
    return false;
  }

  function place(idx: number): boolean {
    if (idx === studentIds.length) return true;
    const studentId = studentIds[idx];
    for (const seatId of seatIds) {
      if (usedSeats.has(seatId)) continue;
      if (conflicts(seatId, studentId)) continue;
      assignments[seatId] = studentId;
      usedSeats.add(seatId);
      if (place(idx + 1)) return true;
      delete assignments[seatId];
      usedSeats.delete(seatId);
    }
    return false;
  }

  return place(0) ? assignments : null;
}

/**
 * Constraint-aware shuffle (PRD v4 §4.7). Produces an assignment that respects
 * all "do not seat together" pairs, or returns null when none exists.
 *
 * Phase 1 — up to 200 random shuffles (fast path; instant when no pairs apply).
 * Phase 2 — backtracking, guaranteed to find a solution if one exists.
 * Phase 3 — caller surfaces the "no valid arrangement" dialog on null.
 */
export function shuffleWithConstraints(period: Period): Record<string, string> | null {
  const seatIds = period.layout.seats.map((s) => s.id);
  if (seatIds.length === 0 || period.roster.length === 0) return {};

  const forbidden = buildForbiddenMap(period);

  // No applicable constraints → a single random shuffle is always valid.
  if (forbidden.size === 0) return shuffleAssignments(period);

  const adjacency = buildAdjacencyMap(period.layout.seats);

  // Phase 1 — random retry.
  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt++) {
    const candidate = shuffleAssignments(period);
    if (respects(candidate, adjacency, forbidden)) return candidate;
  }

  // Phase 2 — backtracking. Cap students to the number of seats (matches the
  // plain-shuffle behavior of seating the first min(seats, students)) and
  // randomize order so repeated clicks can yield different valid charts.
  const students = [...period.roster];
  for (let i = students.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [students[i], students[j]] = [students[j], students[i]];
  }
  const studentIds = students.slice(0, seatIds.length).map((s) => s.id);
  return backtrack(seatIds, studentIds, adjacency, forbidden);
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
