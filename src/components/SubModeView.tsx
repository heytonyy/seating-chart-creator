import type { Period, Student } from '../types';
import { Avatar } from './Avatar';
import { SubNotesEditor } from './SubNotesEditor';
import { CANVAS_HEIGHT, CANVAS_WIDTH, SEAT_HEIGHT, SEAT_WIDTH } from '../layouts';

interface Props {
  period: Period;
  studentById: Map<string, Student>;
  photosEnabled: boolean;
  onUpdateSubNotes: (notes: string) => void;
  /** When true this is the actual Sub mode view (read-only notes).
   *  When false we're in editor mode showing the inline notes editor. */
  readOnly: boolean;
}

/** Format a student name as "First L." for substitute-facing displays. */
function subName(student: Student): string {
  if (!student.lastName) return student.firstName;
  return `${student.firstName} ${student.lastName[0].toUpperCase()}.`;
}

/** Format today's date as "Weekday, Mon D" e.g. "Tuesday, May 26". */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function SubModeView({ period, studentById, photosEnabled, onUpdateSubNotes, readOnly }: Props) {
  const today = formatDate(new Date());
  const studentCount = period.roster.length;

  const teacherLine = [period.teacherName, period.roomNumber ? `Room ${period.roomNumber}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="sub-mode" id="sub-print-root">
      {/* Sub mode preview banner — reminds the teacher this is a preview */}
      {readOnly && (
        <div className="sub-mode__banner" aria-live="polite">
          Preview of what the sub sees — private flags &amp; notes hidden
        </div>
      )}

      <div className="sub-mode__chart">
        {/* Header strip */}
        <div className="sub-mode__header">
          <div className="sub-mode__header-left">
            <div className="sub-mode__period-name">{period.name}</div>
            {teacherLine && (
              <div className="sub-mode__header-meta">{teacherLine}</div>
            )}
          </div>
          <div className="sub-mode__header-right">
            <div className="sub-mode__date">{today}</div>
            <div className="sub-mode__header-meta">
              {studentCount} student{studentCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Seating grid — read-only, same positions as editor */}
        <div className="sub-mode__canvas-wrap">
          <div className={`front-indicator front-indicator--${period.layout.frontOfRoom}`}>
            Front of room
          </div>
          <div
            className="sub-mode__canvas"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          >
            {period.layout.seats.map((seat) => {
              const studentId = period.assignments[seat.id];
              const student = studentId ? (studentById.get(studentId) ?? null) : null;
              return (
                <div
                  key={seat.id}
                  className={`sub-seat${student ? ' sub-seat--filled' : ''}`}
                  style={{
                    position: 'absolute',
                    left: seat.x,
                    top: seat.y,
                    width: SEAT_WIDTH,
                    height: SEAT_HEIGHT,
                  }}
                >
                  {student ? (
                    <>
                      <Avatar
                        firstName={student.firstName}
                        lastName={student.lastName}
                        photoDataUrl={student.photoDataUrl}
                        photosEnabled={photosEnabled}
                        size={42}
                      />
                      <span className="sub-seat__name">{subName(student)}</span>
                    </>
                  ) : (
                    <span className="sub-seat__empty">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes for the substitute */}
        <SubNotesEditor
          value={period.subNotes ?? ''}
          readOnly={readOnly}
          onChange={readOnly ? undefined : onUpdateSubNotes}
        />
      </div>
    </div>
  );
}
