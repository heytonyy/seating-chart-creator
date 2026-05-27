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
  /** Base64 data URL of a resized JPEG/PNG (200×200, ~15–25 KB). Absent until the teacher uploads. */
  photoDataUrl?: string;
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
  /** Teacher's display name shown in the sub-mode header. */
  teacherName?: string;
  /** Room number shown in the sub-mode header. */
  roomNumber?: string;
  /** Class-level notes shown to the substitute in Sub mode and on print. */
  subNotes?: string;
}

export interface AppState {
  periods: Period[];
  activePeriodId: string | null;
  /** Which top-level view is active. Defaults to 'editor'. */
  viewMode: 'editor' | 'sub';
  /** Whether photos are rendered (true) or replaced by initials avatars (false). Persisted. */
  photosEnabled: boolean;
}
