import { useEffect, useRef } from 'react';
import type { AccommodationId } from '../types';
import { ACCOMMODATION_CONFIG, ACCOMMODATION_ORDER } from '../accommodations';

interface Props {
  currentIds: AccommodationId[];
  onAdd: (id: AccommodationId) => void;
  onClose: () => void;
}

/**
 * Small dropdown listing accommodation types NOT yet assigned to the student.
 */
export function AccommodationPicker({ currentIds, onAdd, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const remaining = ACCOMMODATION_ORDER.filter((id) => !currentIds.includes(id));

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

  if (remaining.length === 0) return null;

  return (
    <div ref={ref} className="picker" role="listbox" aria-label="Choose accommodation">
      {remaining.map((id) => {
        const cfg = ACCOMMODATION_CONFIG[id];
        return (
          <button
            key={id}
            type="button"
            className="picker__item"
            role="option"
            aria-selected={false}
            onClick={() => { onAdd(id); onClose(); }}
          >
            <span className="picker__dot" style={{ background: cfg.color }} aria-hidden="true" />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
