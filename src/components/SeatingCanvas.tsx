import { useState } from 'react';
import type { AccommodationId, Layout, Student } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../layouts';
import { SeatBox } from './SeatBox';
import { SubNotesEditor } from './SubNotesEditor';
import { AccommodationLegend } from './AccommodationLegend';

interface Props {
  layout: Layout;
  studentById: Map<string, Student>;
  assignments: Record<string, string>;
  editMode: boolean;
  photosEnabled: boolean;
  privateView: boolean;
  selectedStudentId: string | null;
  teacherName: string;
  roomNumber: string;
  subNotes: string;
  onRemoveSeat: (seatId: string) => void;
  onAddSeat: () => void;
  onRotateFront: () => void;
  onPhotoUpload: (studentId: string, dataUrl: string) => void;
  onPhotoRemove: (studentId: string) => void;
  onUpdateSubNotes: (notes: string) => void;
  onUpdateMeta: (fields: { teacherName?: string; roomNumber?: string }) => void;
  onSelectStudent: (studentId: string) => void;
  onDeselectStudent: () => void;
}

export function SeatingCanvas({
  layout,
  studentById,
  assignments,
  editMode,
  photosEnabled,
  privateView,
  selectedStudentId,
  teacherName,
  roomNumber,
  subNotes,
  onRemoveSeat,
  onAddSeat,
  onRotateFront,
  onPhotoUpload,
  onPhotoRemove,
  onUpdateSubNotes,
  onUpdateMeta,
  onSelectStudent,
  onDeselectStudent,
}: Props) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftTeacher, setDraftTeacher] = useState('');
  const [draftRoom, setDraftRoom] = useState('');

  function openMetaEdit() {
    setDraftTeacher(teacherName);
    setDraftRoom(roomNumber);
    setEditingMeta(true);
  }

  function saveMetaEdit() {
    onUpdateMeta({ teacherName: draftTeacher.trim(), roomNumber: draftRoom.trim() });
    setEditingMeta(false);
  }

  // Collect accommodation IDs currently in use for the legend
  const activeAccommodations = new Set<AccommodationId>();
  for (const student of studentById.values()) {
    for (const id of (student.accommodations ?? [])) {
      activeAccommodations.add(id);
    }
  }

  return (
    <section className="canvas-wrap" aria-label="Seating canvas">
      {/* Period metadata strip */}
      <div className="canvas-meta">
        {editingMeta ? (
          <div className="canvas-meta__form">
            <label className="canvas-meta__label">
              Teacher
              <input
                className="canvas-meta__input"
                value={draftTeacher}
                onChange={(e) => setDraftTeacher(e.target.value)}
                placeholder="Your name"
                autoFocus
              />
            </label>
            <label className="canvas-meta__label">
              Room
              <input
                className="canvas-meta__input canvas-meta__input--narrow"
                value={draftRoom}
                onChange={(e) => setDraftRoom(e.target.value)}
                placeholder="101"
              />
            </label>
            <button type="button" className="canvas-meta__save" onClick={saveMetaEdit}>
              Save
            </button>
            <button type="button" className="btn-ghost canvas-meta__cancel" onClick={() => setEditingMeta(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="canvas-meta__display">
            <span className="canvas-meta__text">
              {teacherName || roomNumber
                ? [teacherName, roomNumber ? `Room ${roomNumber}` : ''].filter(Boolean).join(' · ')
                : 'No teacher / room set'}
            </span>
            <button type="button" className="btn-ghost canvas-meta__edit-btn" onClick={openMetaEdit} title="Edit teacher name and room number">
              ✎ Edit
            </button>
          </div>
        )}
      </div>

      <div className={`front-indicator front-indicator--${layout.frontOfRoom}`}>Front of room</div>

      {/* Canvas — clicking empty space deselects */}
      <div
        className="canvas"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onClick={onDeselectStudent}
      >
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
              photosEnabled={photosEnabled}
              privateView={privateView}
              isSelected={!!occupant && occupant.id === selectedStudentId}
              onRemoveSeat={onRemoveSeat}
              onPhotoUpload={onPhotoUpload}
              onPhotoRemove={onPhotoRemove}
              onSelectStudent={onSelectStudent}
              onDeselectStudent={onDeselectStudent}
            />
          );
        })}
      </div>

      {/* Accommodation legend — only when tags are in use and not in private view */}
      {!privateView && <AccommodationLegend activeIds={activeAccommodations} />}

      {/* Sub notes editor */}
      <SubNotesEditor
        value={subNotes}
        readOnly={false}
        onChange={onUpdateSubNotes}
      />
    </section>
  );
}
