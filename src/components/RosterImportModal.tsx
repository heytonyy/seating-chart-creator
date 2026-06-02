import { useEffect, useRef, useState } from 'react';
import { fullName, parseRosterText, type ParsedStudent } from '../state';
import type { PairFlag, Student } from '../types';

interface Props {
  initialStudents: { firstName: string; lastName: string }[];
  /** Current roster (with stable ids) — used for the Seating rules pickers. */
  roster: Student[];
  pairFlags: PairFlag[];
  onAddPairFlag: (idA: string, idB: string) => void;
  onRemovePairFlag: (idA: string, idB: string) => void;
  onCancel: () => void;
  onSave: (students: ParsedStudent[]) => void;
}

export function RosterImportModal({
  initialStudents,
  roster,
  pairFlags,
  onAddPairFlag,
  onRemovePairFlag,
  onCancel,
  onSave,
}: Props) {
  const [text, setText] = useState(initialStudents.map(fullName).join('\n'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [rulesOpen, setRulesOpen] = useState(pairFlags.length > 0);
  const [pickA, setPickA] = useState('');
  const [pickB, setPickB] = useState('');

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const imported = parseCsvFile(content);
    if (imported.length > 0) {
      const importedLines = imported.map(fullName).join('\n');
      setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${importedLines}` : importedLines));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSave() {
    onSave(parseRosterText(text));
  }

  const parsedCount = parseRosterText(text).length;

  const byId = new Map(roster.map((s) => [s.id, s]));
  const canAddPair = pickA !== '' && pickB !== '' && pickA !== pickB;

  function handleAddPair() {
    if (!canAddPair) return;
    onAddPairFlag(pickA, pickB);
    setPickA('');
    setPickB('');
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import roster"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Import roster</h2>
        <p className="modal__hint">
          Paste student names below — one per line. You can also upload a CSV; the first two columns are used as first and last name.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder={'Ada Lovelace\nAlan Turing\nGrace Hopper\n…'}
          aria-label="Roster names"
        />
        <div className="modal__row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFile}
            aria-label="Upload CSV file"
          />
          <span className="modal__count">{parsedCount} student{parsedCount === 1 ? '' : 's'}</span>
        </div>

        {/* ── Seating rules: "do not seat together" pairs (PRD v4 §4.5) ──── */}
        <div className="seating-rules">
          <button
            type="button"
            className="seating-rules__toggle"
            aria-expanded={rulesOpen}
            onClick={() => setRulesOpen((v) => !v)}
          >
            <span aria-hidden="true">{rulesOpen ? '▾' : '▸'}</span> Seating rules
            {pairFlags.length > 0 ? ` (${pairFlags.length})` : ''}
          </button>
          {rulesOpen && (
            <div className="seating-rules__body">
              <p className="modal__hint">
                Students marked “don’t sit together” will never be seated adjacent by Shuffle.
              </p>
              {pairFlags.length > 0 ? (
                <ul className="seating-rules__list">
                  {pairFlags.map((f) => {
                    const a = byId.get(f.studentA);
                    const b = byId.get(f.studentB);
                    const label = `${a ? fullName(a) : 'Unknown'} ↔ ${b ? fullName(b) : 'Unknown'}`;
                    return (
                      <li key={`${f.studentA}:${f.studentB}`} className="seating-rules__item">
                        <span>{label}</span>
                        <button
                          type="button"
                          className="seating-rules__remove"
                          aria-label={`Remove rule: ${label}`}
                          onClick={() => onRemovePairFlag(f.studentA, f.studentB)}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="seating-rules__empty">No rules yet.</p>
              )}
              {roster.length >= 2 ? (
                <div className="seating-rules__add">
                  <select
                    aria-label="First student"
                    value={pickA}
                    onChange={(e) => setPickA(e.target.value)}
                  >
                    <option value="">Student…</option>
                    {roster.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.id === pickB}>
                        {fullName(s)}
                      </option>
                    ))}
                  </select>
                  <span className="seating-rules__sep" aria-hidden="true">↔</span>
                  <select
                    aria-label="Second student"
                    value={pickB}
                    onChange={(e) => setPickB(e.target.value)}
                  >
                    <option value="">Student…</option>
                    {roster.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.id === pickA}>
                        {fullName(s)}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={handleAddPair} disabled={!canAddPair}>
                    Add
                  </button>
                </div>
              ) : (
                <p className="seating-rules__empty">Save at least two students to add a rule.</p>
              )}
            </div>
          )}
        </div>

        <div className="modal__actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}>
            Save roster
          </button>
        </div>
      </div>
    </div>
  );
}

/** Parse a CSV file. Takes the first two columns of each row as first / last name. Detects and skips a header row. */
function parseCsvFile(content: string): ParsedStudent[] {
  const lines = content.split(/\r?\n/);
  const rows: string[][] = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    rows.push(splitCsvLine(raw));
  }
  if (rows.length === 0) return [];

  // Header detection: header row's first cell contains "name" (case-insensitive).
  const firstCell = (rows[0][0] ?? '').toLowerCase();
  const looksLikeHeader = /name/.test(firstCell);
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;

  const out: ParsedStudent[] = [];
  for (const cols of dataRows) {
    const firstName = (cols[0] ?? '').trim();
    const lastName = (cols[1] ?? '').trim();
    if (!firstName && !lastName) continue;
    out.push({ firstName, lastName });
  }
  return out;
}

/** Minimal CSV line splitter — handles double-quoted fields with embedded commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
