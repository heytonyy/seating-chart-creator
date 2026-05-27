interface Props {
  label: string;
  /** Hex color for the left-side dot and background tint. */
  color?: string;
  onRemove?: () => void;
  onClick?: () => void;
  /** When true, renders a styled "+ Add" chip instead. */
  isAdd?: boolean;
  title?: string;
}

/**
 * Shared chip component used by accommodation tags and pair-flag chips.
 */
export function Chip({ label, color, onRemove, onClick, isAdd = false, title }: Props) {
  const dotStyle = color
    ? { background: color }
    : undefined;

  const chipStyle = color
    ? {
        '--chip-color': color,
        borderColor: `${color}55`,
        background: `${color}18`,
      } as React.CSSProperties
    : undefined;

  if (isAdd) {
    return (
      <button
        type="button"
        className="chip chip--add"
        onClick={onClick}
        title={title}
        aria-label={label}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="chip" style={chipStyle} title={title}>
      {color && <span className="chip__dot" style={dotStyle} aria-hidden="true" />}
      <span className="chip__label">{label}</span>
      {onRemove && (
        <button
          type="button"
          className="chip__remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${label}`}
          onKeyDown={(e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault();
              onRemove();
            }
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
