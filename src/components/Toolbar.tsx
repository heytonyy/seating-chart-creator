import type { PresetKey } from '../layouts';
import { PRESETS } from '../layouts';

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  onShuffle: () => void;
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  canShuffle: boolean;
  onApplyPreset: (preset: PresetKey) => void;
}

export function Toolbar({
  editMode,
  onToggleEdit,
  onShuffle,
  onReset,
  onUndo,
  canUndo,
  canShuffle,
  onApplyPreset,
}: Props) {
  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const key = e.target.value as PresetKey;
    if (!key) return;
    if (confirm('Replace current layout with this preset? Any custom seat positions will be lost. Student assignments will be cleared.')) {
      onApplyPreset(key);
    }
    e.target.value = '';
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Chart actions">
      <button type="button" onClick={onToggleEdit} aria-pressed={editMode}>
        {editMode ? 'Done editing layout' : 'Edit layout'}
      </button>
      <select
        className="preset-select"
        onChange={handlePresetChange}
        aria-label="Apply layout preset"
        defaultValue=""
      >
        <option value="" disabled>
          Apply preset…
        </option>
        {PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="toolbar__sep" aria-hidden="true" />
      <button type="button" onClick={onShuffle} disabled={!canShuffle} title="Randomly assign all students">
        Shuffle
      </button>
      <button type="button" onClick={onReset} title="Clear all assignments">
        Reset
      </button>
      <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo the last shuffle or reset">
        Undo
      </button>
    </div>
  );
}
