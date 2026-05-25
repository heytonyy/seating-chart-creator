import { useDroppable } from '@dnd-kit/core';
import type { Student } from '../types';
import { StudentCard } from './StudentCard';

interface Props {
  students: Student[];
  unassigned: Student[];
  onOpenImport: () => void;
  onClearRoster: () => void;
}

export function RosterPanel({ students, unassigned, onOpenImport, onClearRoster }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: 'roster', data: { type: 'roster' } });

  return (
    <aside className="roster" aria-label="Student roster">
      <div className="roster__header">
        <h2>Roster</h2>
        <div className="roster__counts">
          {unassigned.length} unassigned / {students.length} total
        </div>
        <div className="roster__actions">
          <button type="button" onClick={onOpenImport}>
            {students.length === 0 ? 'Import roster' : 'Edit roster'}
          </button>
          {students.length > 0 && (
            <button type="button" className="btn-ghost" onClick={onClearRoster} title="Remove all students from this period">
              Clear
            </button>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`roster__list ${isOver ? 'roster__list--over' : ''}`}
        aria-label="Unassigned students. Drop a student here to remove from a seat."
      >
        {unassigned.length === 0 && students.length === 0 && (
          <p className="roster__empty">
            No students yet.
            <br />
            Click <strong>Import roster</strong> to add students by pasting a list.
          </p>
        )}
        {unassigned.length === 0 && students.length > 0 && (
          <p className="roster__empty">All students are seated.</p>
        )}
        {unassigned.map((s) => (
          <StudentCard
            key={s.id}
            studentId={s.id}
            firstName={s.firstName}
            lastName={s.lastName}
            variant="roster"
          />
        ))}
      </div>
    </aside>
  );
}
