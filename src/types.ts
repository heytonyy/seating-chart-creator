export type Orientation = 'top' | 'bottom' | 'left' | 'right';

/** Rotation in degrees clockwise from "facing the room's front". */
export type Rotation = 0 | 90 | 180 | 270;

export interface Seat {
  id: string;
  x: number;
  y: number;
  /** Direction the seated student faces, clockwise from the room's front. */
  rotation: Rotation;
}

export interface Layout {
  seats: Seat[];
  frontOfRoom: Orientation;
}

/** Story 3: fixed accommodation vocabulary. */
export type AccommodationId = 'iep' | '504' | 'behavior' | 'preferential';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  /** Base64 data URL of a resized JPEG/PNG (200×200). Absent until uploaded. */
  photoDataUrl?: string;
  /** Story 3: accommodation tags. [] when none. */
  accommodations: AccommodationId[];
  /** Story 3: private teacher notes. '' when none. */
  notes: string;
}

/** Story 3: symmetric pair flag. studentA < studentB (string order). */
export interface PairFlag {
  studentA: string;
  studentB: string;
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
  teacherName?: string;
  roomNumber?: string;
  subNotes?: string;
  /** Story 3: do-not-seat-together pairs. */
  pairFlags: PairFlag[];
}

export interface AppState {
  periods: Period[];
  activePeriodId: string | null;
  viewMode: 'editor' | 'sub';
  photosEnabled: boolean;
}
