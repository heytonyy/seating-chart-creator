import { useState } from 'react';
import type { Period } from '../types';

interface Props {
  periods: Period[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function PeriodTabs({ periods, activeId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function startRename(p: Period) {
    setEditingId(p.id);
    setDraftName(p.name);
  }

  function commitRename() {
    if (editingId && draftName.trim()) {
      onRename(editingId, draftName.trim());
    }
    setEditingId(null);
  }

  function handleCreate() {
    const next = periods.length + 1;
    onCreate(`Period ${next}`);
  }

  return (
    <nav className="period-tabs" aria-label="Class periods">
      <ul role="tablist">
        {periods.map((p) => {
          const active = p.id === activeId;
          if (editingId === p.id) {
            return (
              <li key={p.id} className="period-tab period-tab--editing">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  aria-label="Rename period"
                />
              </li>
            );
          }
          return (
            <li key={p.id} className={`period-tab ${active ? 'period-tab--active' : ''}`}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(p.id)}
                onDoubleClick={() => startRename(p)}
                title="Double-click to rename"
              >
                {p.name}
              </button>
              {active && periods.length > 1 && (
                <button
                  type="button"
                  className="period-tab__close"
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                      onDelete(p.id);
                    }
                  }}
                  aria-label={`Delete ${p.name}`}
                  title="Delete period"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
        <li className="period-tab period-tab--new">
          <button type="button" onClick={handleCreate} aria-label="Create a new period">
            + New period
          </button>
        </li>
      </ul>
    </nav>
  );
}
