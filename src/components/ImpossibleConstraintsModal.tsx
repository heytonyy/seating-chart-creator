import { useEffect, useRef } from 'react';

interface Props {
  onClose: () => void;
}

/**
 * Shown when constraint-aware Shuffle can find no arrangement that satisfies
 * the current "do not seat together" rules (PRD v4 §4.7 Phase 3). The chart is
 * left unchanged. Focus-trapped and Esc-dismissible, matching RosterImportModal.
 */
export function ImpossibleConstraintsModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal modal--narrow"
        role="alertdialog"
        aria-modal="true"
        aria-label="No valid seating arrangement"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>No valid arrangement found</h2>
        <p className="modal__hint">
          The current “don’t sit together” rules can’t all be satisfied with this
          layout. Edit the rules and try shuffling again. Your seating chart was
          left unchanged.
        </p>
        <div className="modal__actions">
          <button type="button" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
