import type { Layout, Seat } from './types';
import { genId } from './storage';

export const SEAT_WIDTH = 84;
export const SEAT_HEIGHT = 60;
export const CANVAS_WIDTH = 880;
export const CANVAS_HEIGHT = 600;
export const GRID_SNAP = 8;

function mkSeat(x: number, y: number): Seat {
  return { id: genId('seat'), x, y };
}

function rows(): Seat[] {
  // 6 columns × 5 rows = 30 seats
  const seats: Seat[] = [];
  const cols = 6;
  const rowCount = 5;
  const xGap = 32;
  const yGap = 32;
  const totalW = cols * SEAT_WIDTH + (cols - 1) * xGap;
  const startX = Math.round((CANVAS_WIDTH - totalW) / 2);
  const startY = 80;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push(mkSeat(startX + c * (SEAT_WIDTH + xGap), startY + r * (SEAT_HEIGHT + yGap)));
    }
  }
  return seats;
}

function clustersOfFour(): Seat[] {
  // 4 clusters per row × 2 rows = 8 clusters of 4 = 32 seats
  const seats: Seat[] = [];
  const clustersPerRow = 4;
  const clusterRows = 2;
  const innerGap = 8;
  const clusterW = SEAT_WIDTH * 2 + innerGap;
  const clusterH = SEAT_HEIGHT * 2 + innerGap;
  const xGap = 40;
  const yGap = 56;
  const totalW = clustersPerRow * clusterW + (clustersPerRow - 1) * xGap;
  const startX = Math.round((CANVAS_WIDTH - totalW) / 2);
  const startY = 80;
  for (let cr = 0; cr < clusterRows; cr++) {
    for (let cc = 0; cc < clustersPerRow; cc++) {
      const ox = startX + cc * (clusterW + xGap);
      const oy = startY + cr * (clusterH + yGap);
      seats.push(mkSeat(ox, oy));
      seats.push(mkSeat(ox + SEAT_WIDTH + innerGap, oy));
      seats.push(mkSeat(ox, oy + SEAT_HEIGHT + innerGap));
      seats.push(mkSeat(ox + SEAT_WIDTH + innerGap, oy + SEAT_HEIGHT + innerGap));
    }
  }
  return seats;
}

function uShape(): Seat[] {
  // Top row, plus down each side. ~28 seats.
  const seats: Seat[] = [];
  const cols = 6;
  const xGap = 32;
  const totalW = cols * SEAT_WIDTH + (cols - 1) * xGap;
  const startX = Math.round((CANVAS_WIDTH - totalW) / 2);
  const startY = 80;
  // Top row
  for (let c = 0; c < cols; c++) {
    seats.push(mkSeat(startX + c * (SEAT_WIDTH + xGap), startY));
  }
  // Sides going down
  const sideRows = 4;
  const yGap = 32;
  const leftX = startX;
  const rightX = startX + (cols - 1) * (SEAT_WIDTH + xGap);
  for (let r = 1; r <= sideRows; r++) {
    const y = startY + r * (SEAT_HEIGHT + yGap);
    seats.push(mkSeat(leftX, y));
    seats.push(mkSeat(leftX + SEAT_WIDTH + xGap, y));
    seats.push(mkSeat(rightX - SEAT_WIDTH - xGap, y));
    seats.push(mkSeat(rightX, y));
  }
  return seats;
}

function paired(): Seat[] {
  // 3 pairs per row × 5 rows = 30 seats
  const seats: Seat[] = [];
  const pairsPerRow = 3;
  const rowCount = 5;
  const innerGap = 8;
  const pairW = SEAT_WIDTH * 2 + innerGap;
  const xGap = 56;
  const yGap = 28;
  const totalW = pairsPerRow * pairW + (pairsPerRow - 1) * xGap;
  const startX = Math.round((CANVAS_WIDTH - totalW) / 2);
  const startY = 80;
  for (let r = 0; r < rowCount; r++) {
    for (let p = 0; p < pairsPerRow; p++) {
      const ox = startX + p * (pairW + xGap);
      const oy = startY + r * (SEAT_HEIGHT + yGap);
      seats.push(mkSeat(ox, oy));
      seats.push(mkSeat(ox + SEAT_WIDTH + innerGap, oy));
    }
  }
  return seats;
}

export type PresetKey = 'rows' | 'clusters' | 'u-shape' | 'paired' | 'empty';

export const PRESETS: { key: PresetKey; label: string; build: () => Layout }[] = [
  { key: 'rows', label: 'Rows', build: () => ({ seats: rows(), frontOfRoom: 'top' }) },
  { key: 'clusters', label: 'Clusters of 4', build: () => ({ seats: clustersOfFour(), frontOfRoom: 'top' }) },
  { key: 'u-shape', label: 'U-shape', build: () => ({ seats: uShape(), frontOfRoom: 'top' }) },
  { key: 'paired', label: 'Paired desks', build: () => ({ seats: paired(), frontOfRoom: 'top' }) },
  { key: 'empty', label: 'Blank canvas', build: () => ({ seats: [], frontOfRoom: 'top' }) },
];
