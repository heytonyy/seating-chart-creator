interface Props {
  value: string;
  onChange?: (value: string) => void;
  /** When true, render as static text (Sub mode & print). When false, render as a textarea. */
  readOnly?: boolean;
}

/**
 * "Notes for the substitute" field.
 * Editable inline in Editor mode; read-only paragraph in Sub mode and on print.
 */
export function SubNotesEditor({ value, onChange, readOnly = false }: Props) {
  return (
    <div className="sub-notes">
      <h3 className="sub-notes__heading">Notes for the substitute</h3>
      {readOnly ? (
        value ? (
          <p className="sub-notes__body">{value}</p>
        ) : (
          <p className="sub-notes__empty">No notes for this period.</p>
        )
      ) : (
        <textarea
          className="sub-notes__textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Add notes visible to the substitute (e.g. early dismissals, seating reminders)…"
          rows={3}
          aria-label="Notes for the substitute"
        />
      )}
    </div>
  );
}
