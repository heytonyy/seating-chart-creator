import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import type { Orientation, Seat, Student } from '../types';
import { SEAT_WIDTH, SEAT_HEIGHT } from '../layouts';
import { ACCOMMODATION_CONFIG, ACCOMMODATION_ORDER } from '../accommodations';
import { StudentCard } from './StudentCard';
import { PhotoUploadMenu } from './PhotoUploadMenu';

interface Props {
  seat: Seat;
  occupant: Student | null;
  editMode: boolean;
  photosEnabled: boolean;
  /** When true, accommodation dots and other private data are hidden. */
  privateView: boolean;
  isSelected: boolean;
  /** Direction the room's front faces — the baseline for seat rotation. */
  frontOfRoom: Orientation;
  onRemoveSeat: (seatId: string) => void;
  onRotateSeat: (seatId: string) => void;
  onPhotoUpload: (studentId: string, dataUrl: string) => void;
  onPhotoRemove: (studentId: string) => void;
  onSelectStudent: (studentId: string) => void;
  onDeselectStudent: () => void;
}

/** Clockwise screen directions, used to map rotation onto the facing edge. */
const DIR_ORDER: Orientation[] = ['top', 'right', 'bottom', 'left'];
/** Rotation → label relative to the room's front (PRD v4 §2.4 aria-label). */
const FACING_LABEL: Record<number, string> = { 0: 'front', 90: 'right', 180: 'back', 270: 'left' };

export function SeatBox({
  seat,
  occupant,
  editMode,
  photosEnabled,
  privateView,
  isSelected,
  frontOfRoom,
  onRemoveSeat,
  onRotateSeat,
  onPhotoUpload,
  onPhotoRemove,
  onSelectStudent,
  onDeselectStudent,
}: Props) {
  // Screen edge the student faces = room front rotated clockwise by `rotation`.
  const facing = DIR_ORDER[(DIR_ORDER.indexOf(frontOfRoom) + seat.rotation / 90) % 4];
  const facingLabel = FACING_LABEL[seat.rotation];
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
    zIndex: isDragging ? 20 : isOver ? 5 : isSelected ? 4 : 1,
  };

  const setRef = (node: HTMLDivElement | null) => {
    dropRef(node);
    if (editMode) dragRef(node);
  };

  const className = [
    'seat',
    `seat--front-${facing}`,
    isOver && 'seat--over',
    occupant && 'seat--filled',
    editMode && 'seat--editable',
    isDragging && 'seat--dragging',
    !editMode && occupant && 'seat--has-occupant',
    isSelected && 'seat--selected',
  ]
    .filter(Boolean)
    .join(' ');

  // Accommodation dots to render (only in editor, non-private view)
  const dots =
    !editMode && !privateView && occupant && occupant.accommodations?.length > 0
      ? ACCOMMODATION_ORDER.filter((id) => occupant.accommodations.includes(id))
      : [];

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation(); // prevent canvas background click from deselecting
    if (editMode || !occupant) return;
    if (isSelected) {
      onDeselectStudent();
    } else {
      onSelectStudent(occupant.id);
    }
  }

  return (
    <div
      ref={setRef}
      style={style}
      className={className}
      onClick={handleClick}
      {...(editMode ? attributes : {})}
      {...(editMode ? listeners : {})}
      aria-label={
        editMode
          ? 'Seat. Drag to reposition.'
          : occupant
            ? `Seat occupied by ${occupant.firstName} ${occupant.lastName}. ${isSelected ? 'Selected.' : 'Click to view details.'}`
            : 'Empty seat. Drop a student here.'
      }
    >
      {/* Front-edge direction marker — visible in and out of edit mode */}
      <span className={`seat__facing seat__facing--${facing}`} aria-hidden="true">
        ▲
      </span>

      {/* Accommodation dots — top-right corner */}
      {dots.length > 0 && (
        <div className="seat__dots" aria-hidden="true">
          {dots.map((id) => (
            <span
              key={id}
              className="seat__dot"
              style={{ background: ACCOMMODATION_CONFIG[id].color }}
              title={ACCOMMODATION_CONFIG[id].label}
            />
          ))}
        </div>
      )}

      {editMode && (
        <>
          <button
            type="button"
            className="seat__rotate"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRotateSeat(seat.id);
            }}
            aria-label={`Rotate seat (currently facing ${facingLabel})`}
            title={`Rotate seat (currently facing ${facingLabel})`}
          >
            ↻
          </button>
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
        </>
      )}

      {!editMode && occupant && (
        <>
          <StudentCard
            studentId={occupant.id}
            firstName={occupant.firstName}
            lastName={occupant.lastName}
            sourceSeatId={seat.id}
            variant="seated"
            photoDataUrl={occupant.photoDataUrl}
            photosEnabled={photosEnabled}
          />
          <PhotoUploadMenu
            hasPhoto={!!occupant.photoDataUrl}
            onUpload={(dataUrl) => onPhotoUpload(occupant.id, dataUrl)}
            onRemove={() => onPhotoRemove(occupant.id)}
          />
        </>
      )}

      {!editMode && !occupant && <span className="seat__placeholder">Empty</span>}
    </div>
  );
}
