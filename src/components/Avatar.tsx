import type { CSSProperties } from 'react';

interface Props {
  firstName: string;
  lastName: string;
  photoDataUrl?: string;
  /** When false, always render the initials disc (photo is hidden but layout is unchanged). */
  photosEnabled: boolean;
  /** Diameter in px. Default 48. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shared avatar component: shows a student photo when available and enabled,
 * otherwise an initials disc. Both take the same size, so toggling photosEnabled
 * never shifts the surrounding layout.
 */
export function Avatar({
  firstName,
  lastName,
  photoDataUrl,
  photosEnabled,
  size = 48,
  className = '',
  style,
}: Props) {
  const initials =
    [firstName[0], lastName[0]]
      .filter(Boolean)
      .map((c) => c.toUpperCase())
      .join('') || '?';

  const fullLabel = [firstName, lastName].filter(Boolean).join(' ');

  if (photosEnabled && photoDataUrl) {
    return (
      <img
        src={photoDataUrl}
        alt={fullLabel}
        className={`avatar avatar--photo${className ? ` ${className}` : ''}`}
        style={{ width: size, height: size, borderRadius: '50%', ...style }}
        draggable={false}
      />
    );
  }

  return (
    <div
      className={`avatar avatar--initials${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={fullLabel}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), ...style }}
    >
      <span aria-hidden="true">{initials}</span>
    </div>
  );
}
