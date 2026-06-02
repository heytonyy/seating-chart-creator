import type { Seat } from './types';
import { SEAT_WIDTH } from './layouts';

/**
 * Two seats are adjacent when the Euclidean distance between their centers is
 * below 1.5 × SEAT_WIDTH (~126px at the current 84px seat width). This catches
 * side-by-side, front-back, and diagonal neighbors across all preset layouts
 * and hand-edited charts (PRD v4 §4.6). Adjacency ignores seat rotation.
 */
export const ADJACENCY_THRESHOLD = 1.5 * SEAT_WIDTH;

/** Map of seatId → set of seatIds adjacent to it. Symmetric. */
export function buildAdjacencyMap(seats: Seat[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const seat of seats) map.set(seat.id, new Set());

  const threshSq = ADJACENCY_THRESHOLD * ADJACENCY_THRESHOLD;
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const a = seats[i];
      const b = seats[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < threshSq) {
        map.get(a.id)!.add(b.id);
        map.get(b.id)!.add(a.id);
      }
    }
  }
  return map;
}
