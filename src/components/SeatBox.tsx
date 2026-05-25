import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import type { Seat, Student } from '../types';
import { SEAT_WIDTH, SEAT_HEIGHT } from '../layouts';
import { StudentCard } from './StudentCard';

interface Props {
  seat: Seat;
  occupant: Student | null;
  editMode: boolean;
  onRemoveSeat: (seatId: string) => void;
}

export function SeatBox({ seat, occupant, editMode, onRemoveSeat }: Props) {
  const { isOver, setNodeRef: dropRef } = useDroppable({
    id: `seat:${seat.id}`,
    data: { type: 'seat', seatId: seat.id },
    disabled: editMode,
  });

  const {
    attributes,
    listeners,
    setNodeRef: dragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `seat-move:${seat.id}`,
    data: { type: 'seat-move', seatId: seat.id },
    disabled: !editMode,
  });

  const style: CSSProperties = {
    position: 'absolute',
    left: seat.x,
    top: seat.y,
    width: SEAT_WIDTH,
    height: SEAT_HEIGHT,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 20 : isOver ? 5 : 1,
  };

  const setRef = (node: HTMLDivElement | null) => {
    dropRef(node);
    if (editMode) dragRef(node);
  };

  const className = [
    'seat',
    isOver && 'seat--over',
    occupant && 'seat--filled',
    editMode && 'seat--editable',
    isDragging && 'seat--dragging',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setRef}
      style={style}
      className={className}
      {...(editMode ? attributes : {})}
      {...(editMode ? listeners : {})}
      aria-label={
        editMode
          ? `Seat. Drag to reposition.`
          : occupant
            ? `Seat occupied by ${occupant.firstName} ${occupant.lastName}. Drop a student here to swap.`
            : 'Empty seat. Drop a student here.'
      }
    >
      {editMode && (
        <button
          type="button"
          className="seat__remove"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveSeat(seat.id);
          }}
          aria-label="Remove seat"
          title="Remove seat"
        >
          ×
        </button>
      )}
      {!editMode && occupant && (
        <StudentCard
          studentId={occupant.id}
          firstName={occupant.firstName}
          lastName={occupant.lastName}
          sourceSeatId={seat.id}
          variant="seated"
        />
      )}
      {!editMode && !occupant && <span className="seat__placeholder">Empty</span>}
    </div>
  );
}
