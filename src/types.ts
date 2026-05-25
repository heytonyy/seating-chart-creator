export type Orientation = 'top' | 'bottom' | 'left' | 'right';

export interface Seat {
  id: string;
  x: number;
  y: number;
}

export interface Layout {
  seats: Seat[];
  frontOfRoom: Orientation;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Period {
  id: string;
  name: string;
  layout: Layout;
  roster: Student[];
  /** Map of seatId -> studentId. Absent key means seat is empty. */
  assignments: Record<string, string>;
  /** Snapshot of assignments before the most recent destructive action (shuffle/reset). */
  undoSnapshot: Record<string, string> | null;
  updatedAt: number;
}

export interface AppState {
  periods: Period[];
  activePeriodId: string | null;
}
