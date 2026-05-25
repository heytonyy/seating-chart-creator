import { useEffect, useState } from 'react';

interface Props {
  /** Wall-clock timestamp of the most recent save. 0 means never. */
  lastSavedAt: number;
  /** True while a save is pending (debounce in flight). */
  pending: boolean;
}

export function SaveIndicator({ lastSavedAt, pending }: Props) {
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (pending) {
    return <span className="save-indicator save-indicator--pending">Saving…</span>;
  }
  if (lastSavedAt === 0) {
    return <span className="save-indicator">Not saved yet</span>;
  }
  return <span className="save-indicator save-indicator--saved">Auto-saved {formatRelative(lastSavedAt)}</span>;
}

function formatRelative(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 5_000) return 'just now';
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}
