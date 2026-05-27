import { useEffect, useRef, useState } from 'react';
import type { Student } from '../types';

interface Props {
  /** All students in the period except the currently selected one and already-flagged ones. */
  eligible: Student[];
  onAdd: (studentId: string) => void;
  onClose: () => void;
}

function shortName(s: Student): string {
  return s.lastName ? `${s.firstName} ${s.lastName[0]}.` : s.firstName;
}

/**
 * Searchable list of students for adding a "do not seat together" pair flag.
 */
export function StudentPicker({ eligible, onAdd, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? eligible.filter((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(query.toLowerCase()),
      )
    : eligible;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Esc
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-focus search box
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  if (eligible.length === 0) {
    return (
      <div ref={ref} className="picker picker--empty">
        <p>No eligible students</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="picker picker--students">
      <input
        ref={searchRef}
        className="picker__search"
        type="search"
        placeholder="Search students…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search students"
      />
      <div className="picker__list" role="listbox" aria-label="Students">
        {filtered.length === 0 && (
          <p className="picker__no-results">No match</p>
        )}
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            className="picker__item"
            role="option"
            aria-selected={false}
            onClick={() => { onAdd(s.id); onClose(); }}
          >
            {shortName(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
