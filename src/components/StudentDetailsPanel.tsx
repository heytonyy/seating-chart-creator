import { useState } from 'react';
import type { AccommodationId, Period, Student } from '../types';
import { ACCOMMODATION_CONFIG, ACCOMMODATION_ORDER } from '../accommodations';
import { Avatar } from './Avatar';
import { Chip } from './Chip';
import { AccommodationPicker } from './AccommodationPicker';
import { StudentPicker } from './StudentPicker';

const NOTES_MAX = 2000;
const NOTES_WARN_THRESHOLD = 200;

interface Props {
  student: Student;
  period: Period;
  studentById: Map<string, Student>;
  photosEnabled: boolean;
  savePending: boolean;
  onClose: () => void;
  onUpdateAccommodations: (studentId: string, ids: AccommodationId[]) => void;
  onUpdateNotes: (studentId: string, notes: string) => void;
  onAddPairFlag: (idA: string, idB: string) => void;
  onRemovePairFlag: (idA: string, idB: string) => void;
}

function shortName(s: Student): string {
  return s.lastName ? `${s.firstName} ${s.lastName[0]}.` : s.firstName;
}

export function StudentDetailsPanel({
  student,
  period,
  studentById,
  photosEnabled,
  savePending,
  onClose,
  onUpdateAccommodations,
  onUpdateNotes,
  onAddPairFlag,
  onRemovePairFlag,
}: Props) {
  const [showAccPicker, setShowAccPicker] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  // ── Accommodation helpers ───────────────────────────────────────────────
  function handleRemoveAccommodation(id: AccommodationId) {
    onUpdateAccommodations(student.id, student.accommodations.filter((a) => a !== id));
  }

  function handleAddAccommodation(id: AccommodationId) {
    if (!student.accommodations.includes(id)) {
      onUpdateAccommodations(student.id, [...student.accommodations, id]);
    }
  }

  // ── Pair flag helpers ───────────────────────────────────────────────────
  const pairFlags = (period.pairFlags ?? []).filter(
    (f) => f.studentA === student.id || f.studentB === student.id,
  );
  const pairedIds = new Set(
    pairFlags.map((f) => (f.studentA === student.id ? f.studentB : f.studentA)),
  );

  // Students eligible to be added as a pair flag: not self, not already flagged
  const eligibleForPair = period.roster.filter(
    (s) => s.id !== student.id && !pairedIds.has(s.id),
  );

  // ── Notes helpers ────────────────────────────────────────────────────────
  const notes = student.notes ?? '';
  const charsLeft = NOTES_MAX - notes.length;
  const showCounter = charsLeft <= NOTES_WARN_THRESHOLD;

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    if (val.length > NOTES_MAX) return; // reject beyond cap
    onUpdateNotes(student.id, val);
  }

  // ── Active accommodations in display order ──────────────────────────────
  const sortedAccommodations = ACCOMMODATION_ORDER.filter((id) =>
    student.accommodations.includes(id),
  );

  const displayName = student.lastName
    ? `${student.firstName} ${student.lastName}`
    : student.firstName;

  return (
    <aside className="details-panel" aria-label={`Details for ${displayName}`}>
      {/* Header */}
      <div className="details-panel__header">
        <Avatar
          firstName={student.firstName}
          lastName={student.lastName}
          photoDataUrl={student.photoDataUrl}
          photosEnabled={photosEnabled}
          size={44}
        />
        <div className="details-panel__header-text">
          <div className="details-panel__name">{displayName}</div>
          <div className="details-panel__subtitle">{period.name}</div>
        </div>
        <button
          type="button"
          className="details-panel__close btn-ghost"
          onClick={onClose}
          aria-label="Close details panel"
        >
          ✕
        </button>
      </div>

      <div className="details-panel__body">
        {/* ── Accommodations ─────────────────────────────────────────── */}
        <section className="details-panel__section">
          <h3 className="details-panel__section-title">Accommodations</h3>
          <div className="details-panel__chips">
            {sortedAccommodations.map((id) => {
              const cfg = ACCOMMODATION_CONFIG[id];
              return (
                <Chip
                  key={id}
                  label={cfg.label}
                  color={cfg.color}
                  onRemove={() => handleRemoveAccommodation(id)}
                  title={`Remove ${cfg.label}`}
                />
              );
            })}
            {sortedAccommodations.length < ACCOMMODATION_ORDER.length && (
              <div className="details-panel__picker-wrap">
                <Chip
                  label="+ Add"
                  isAdd
                  onClick={() => setShowAccPicker((v) => !v)}
                />
                {showAccPicker && (
                  <AccommodationPicker
                    currentIds={student.accommodations}
                    onAdd={handleAddAccommodation}
                    onClose={() => setShowAccPicker(false)}
                  />
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Do not seat with ───────────────────────────────────────── */}
        <section className="details-panel__section">
          <h3 className="details-panel__section-title">Do not seat with</h3>
          <div className="details-panel__chips">
            {pairFlags.map((flag) => {
              const otherId = flag.studentA === student.id ? flag.studentB : flag.studentA;
              const other = studentById.get(otherId);
              if (!other) return null;
              return (
                <Chip
                  key={otherId}
                  label={shortName(other)}
                  onRemove={() => onRemovePairFlag(student.id, otherId)}
                  title={`Remove pair flag with ${shortName(other)}`}
                />
              );
            })}
            {eligibleForPair.length > 0 && (
              <div className="details-panel__picker-wrap">
                <Chip
                  label="+ Add"
                  isAdd
                  onClick={() => setShowStudentPicker((v) => !v)}
                />
                {showStudentPicker && (
                  <StudentPicker
                    eligible={eligibleForPair}
                    onAdd={(id) => onAddPairFlag(student.id, id)}
                    onClose={() => setShowStudentPicker(false)}
                  />
                )}
              </div>
            )}
            {pairFlags.length === 0 && eligibleForPair.length === 0 && (
              <span className="details-panel__empty">No other students in roster</span>
            )}
          </div>
        </section>

        {/* ── Notes ──────────────────────────────────────────────────── */}
        <section className="details-panel__section details-panel__section--notes">
          <div className="details-panel__notes-header">
            <h3 className="details-panel__section-title">Notes</h3>
            <span
              className={`details-panel__save-indicator${savePending ? ' details-panel__save-indicator--pending' : ''}`}
            >
              {savePending ? 'Saving…' : 'Auto-saved'}
            </span>
          </div>
          <textarea
            className="details-panel__notes"
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add private notes about this student…"
            rows={5}
            aria-label="Student notes"
            maxLength={NOTES_MAX + 1} // allow typing but reject in handler
          />
          {showCounter && (
            <div
              className={`details-panel__char-counter${charsLeft <= 0 ? ' details-panel__char-counter--over' : ''}`}
              aria-live="polite"
            >
              {charsLeft} / {NOTES_MAX} remaining
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
