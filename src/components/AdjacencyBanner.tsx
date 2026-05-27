import { useState } from 'react';
import type { PairFlag, Student } from '../types';

interface Props {
  violations: PairFlag[];
  studentById: Map<string, Student>;
  onDismiss: () => void;
}

function shortName(s: Student): string {
  return s.lastName ? `${s.firstName} ${s.lastName[0]}.` : s.firstName;
}

/**
 * Red banner shown above the canvas when flagged students are seated adjacent.
 * role="alert" ensures screen readers announce new violations without interrupting
 * drag-drop announcements.
 */
export function AdjacencyBanner({ violations, studentById, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (violations.length === 0) return null;

  const firstA = studentById.get(violations[0].studentA);
  const firstB = studentById.get(violations[0].studentB);
  const pairLabel =
    firstA && firstB
      ? `${shortName(firstA)} and ${shortName(firstB)} are marked "do not seat together"`
      : 'A flagged pair is adjacent';

  return (
    <div className="adj-banner" role="alert" aria-live="polite">
      <div className="adj-banner__body">
        <span className="adj-banner__icon" aria-hidden="true">⚠</span>
        <div className="adj-banner__text">
          <strong className="adj-banner__title">
            {violations.length === 1
              ? 'Flagged pair seated adjacent'
              : `${violations.length} flagged pairs seated adjacent`}
          </strong>
          {violations.length === 1 ? (
            <span className="adj-banner__detail">{pairLabel}</span>
          ) : (
            <>
              <button
                type="button"
                className="adj-banner__expand"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? 'Hide details ▲' : 'Show details ▼'}
              </button>
              {expanded && (
                <ul className="adj-banner__list">
                  {violations.map((v) => {
                    const sA = studentById.get(v.studentA);
                    const sB = studentById.get(v.studentB);
                    if (!sA || !sB) return null;
                    return (
                      <li key={`${v.studentA}:${v.studentB}`}>
                        {shortName(sA)} and {shortName(sB)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className="adj-banner__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss adjacency warning"
      >
        Dismiss
      </button>
    </div>
  );
}
