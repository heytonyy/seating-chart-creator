import type { Period, PairFlag } from './types';
import { SEAT_WIDTH, SEAT_HEIGHT } from './layouts';

/**
 * Two seats are adjacent when the shortest edge-to-edge distance in both axes is ≤ 40 px.
 * This catches side-by-side, front-back, and diagonal pairs in all preset layouts.
 */
const ADJACENCY_THRESHOLD = 40;

export function findAdjacentViolations(period: Period): PairFlag[] {
  if (!period.pairFlags || period.pairFlags.length === 0) return [];

  // Build seatId → {x, y} lookup
  const seatPos = new Map<string, { x: number; y: number }>();
  for (const seat of period.layout.seats) {
    seatPos.set(seat.id, { x: seat.x, y: seat.y });
  }

  // Build studentId → seat position lookup (only seated students)
  const studentPos = new Map<string, { x: number; y: number }>();
  for (const [seatId, studentId] of Object.entries(period.assignments)) {
    const pos = seatPos.get(seatId);
    if (pos) studentPos.set(studentId, pos);
  }

  const violations: PairFlag[] = [];
  for (const flag of period.pairFlags) {
    const posA = studentPos.get(flag.studentA);
    const posB = studentPos.get(flag.studentB);
    // Both must be seated for a warning to fire.
    if (!posA || !posB) continue;

    const dx = Math.max(0, Math.abs(posA.x - posB.x) - SEAT_WIDTH);
    const dy = Math.max(0, Math.abs(posA.y - posB.y) - SEAT_HEIGHT);
    if (dx <= ADJACENCY_THRESHOLD && dy <= ADJACENCY_THRESHOLD) {
      violations.push(flag);
    }
  }
  return violations;
}

/** Stable string key representing the current set of violating pairs. */
export function violationKey(violations: PairFlag[]): string {
  return violations
    .map((v) => `${v.studentA}:${v.studentB}`)
    .sort()
    .join('|');
}
