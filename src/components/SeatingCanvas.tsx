import type { Layout, Student } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../layouts';
import { SeatBox } from './SeatBox';

interface Props {
  layout: Layout;
  studentById: Map<string, Student>;
  assignments: Record<string, string>;
  editMode: boolean;
  onRemoveSeat: (seatId: string) => void;
  onAddSeat: () => void;
  onRotateFront: () => void;
}

export function SeatingCanvas({
  layout,
  studentById,
  assignments,
  editMode,
  onRemoveSeat,
  onAddSeat,
  onRotateFront,
}: Props) {
  return (
    <section className="canvas-wrap" aria-label="Seating canvas">
      <div className={`front-indicator front-indicator--${layout.frontOfRoom}`}>Front of room</div>
      <div className="canvas" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        {editMode && (
          <div className="canvas__edit-toolbar">
            <button type="button" onClick={onAddSeat}>
              + Add seat
            </button>
            <button type="button" onClick={onRotateFront} title="Rotate which side is the front of the room">
              Rotate front ({layout.frontOfRoom})
            </button>
          </div>
        )}
        {layout.seats.length === 0 && (
          <div className="canvas__empty">
            <p>No seats yet. Switch to <strong>Edit layout</strong> to add seats, or pick a preset.</p>
          </div>
        )}
        {layout.seats.map((seat) => {
          const studentId = assignments[seat.id];
          const occupant = studentId ? studentById.get(studentId) ?? null : null;
          return (
            <SeatBox
              key={seat.id}
              seat={seat}
              occupant={occupant}
              editMode={editMode}
              onRemoveSeat={onRemoveSeat}
            />
          );
        })}
      </div>
    </section>
  );
}
