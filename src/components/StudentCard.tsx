import { useDraggable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';

interface Props {
  studentId: string;
  firstName: string;
  lastName: string;
  sourceSeatId?: string;
  variant?: 'roster' | 'seated';
}

export function StudentCard({ studentId, firstName, lastName, sourceSeatId, variant = 'roster' }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `student:${studentId}`,
    data: { type: 'student', studentId, sourceSeatId },
  });

  const displayName = lastName ? `${firstName} ${lastName}` : firstName;

  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (variant === 'seated') {
    const longest = Math.max(firstName.length, lastName.length || 1);
    const fontSize = scaledFontSize(longest);
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, fontSize: `${fontSize}px` }}
        className="student-card student-card--seated"
        {...attributes}
        {...listeners}
        aria-label={`Student ${displayName}. Press space to pick up, arrow keys to move, space to drop.`}
      >
        <span className="student-card__line student-card__line--first">{firstName}</span>
        {lastName && <span className="student-card__line student-card__line--last">{lastName}</span>}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="student-card student-card--roster"
      {...attributes}
      {...listeners}
      aria-label={`Student ${displayName}. Press space to pick up, arrow keys to move, space to drop.`}
    >
      {displayName}
    </div>
  );
}

/** Map longest name-part length to a font size (px). Linear bands give predictable scaling within the fixed seat. */
function scaledFontSize(longest: number): number {
  if (longest <= 6) return 13;
  if (longest <= 8) return 12;
  if (longest <= 10) return 11;
  if (longest <= 12) return 10;
  if (longest <= 14) return 9;
  return 8;
}
