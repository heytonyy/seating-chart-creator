import type { AccommodationId } from '../types';
import { ACCOMMODATION_CONFIG, ACCOMMODATION_ORDER } from '../accommodations';

interface Props {
  /** Only the accommodation IDs that are actually in use for this period. */
  activeIds: Set<AccommodationId>;
}

/**
 * Color legend rendered below the seating canvas.
 * Only renders when at least one student in the period has at least one tag.
 */
export function AccommodationLegend({ activeIds }: Props) {
  const entries = ACCOMMODATION_ORDER.filter((id) => activeIds.has(id));
  if (entries.length === 0) return null;

  return (
    <div className="acc-legend" aria-label="Accommodation color legend">
      {entries.map((id) => {
        const cfg = ACCOMMODATION_CONFIG[id];
        return (
          <span key={id} className="acc-legend__item">
            <span
              className="acc-legend__dot"
              style={{ background: cfg.color }}
              aria-hidden="true"
            />
            <span className="acc-legend__label">{cfg.label}</span>
          </span>
        );
      })}
    </div>
  );
}
