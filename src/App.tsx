import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import type { AppState, Orientation, Period, Student } from './types';
import { genId, loadState, saveState } from './storage';
import { emptyState, findPeriod, fullName, newPeriod, shuffleAssignments, updatePeriod, type ParsedStudent } from './state';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRID_SNAP, PRESETS, SEAT_HEIGHT, SEAT_WIDTH, type PresetKey } from './layouts';
import { PeriodTabs } from './components/PeriodTabs';
import { RosterPanel } from './components/RosterPanel';
import { SeatingCanvas } from './components/SeatingCanvas';
import { Toolbar } from './components/Toolbar';
import { RosterImportModal } from './components/RosterImportModal';
import { SaveIndicator } from './components/SaveIndicator';
import { ThemeToggle } from './components/ThemeToggle';
import { SubModeView } from './components/SubModeView';
import { applyTheme, getInitialTheme, getStoredTheme, storeTheme, type Theme } from './theme';

const AUTOSAVE_DEBOUNCE_MS = 500;

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    if (loaded) return loaded;
    const fresh = emptyState();
    // Ensure fresh state has Story-2 fields.
    return { ...fresh, viewMode: 'editor', photosEnabled: true };
  });
  const [editMode, setEditMode] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeDragStudent, setActiveDragStudent] = useState<Student | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const t = getInitialTheme();
    applyTheme(t);
    return t;
  });

  // Follow system changes only while the user hasn't set an override.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (getStoredTheme() !== null) return;
      const next: Theme = e.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function handleToggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    storeTheme(next);
  }

  // Auto-save: debounce all state changes.
  useEffect(() => {
    setSavePending(true);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const result = saveState(state);
      setSavePending(false);
      if (result === 'ok') {
        setLastSavedAt(Date.now());
        setSaveError(false);
      } else {
        setSaveError(true);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  const period = findPeriod(state);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const studentById = useMemo(() => {
    const m = new Map<string, Student>();
    if (period) for (const s of period.roster) m.set(s.id, s);
    return m;
  }, [period]);

  const unassigned = useMemo(() => {
    if (!period) return [];
    const seated = new Set(Object.values(period.assignments));
    return period.roster.filter((s) => !seated.has(s.id));
  }, [period]);

  function mutatePeriod(mut: (p: Period) => Period) {
    if (!period) return;
    setState((s) => updatePeriod(s, period.id, mut));
  }

  // ── View mode ─────────────────────────────────────────────────────────────
  const viewMode = state.viewMode ?? 'editor';
  const photosEnabled = state.photosEnabled ?? true;

  function handleSetViewMode(mode: 'editor' | 'sub') {
    setState((s) => ({ ...s, viewMode: mode }));
    if (mode === 'editor') setEditMode(false);
  }

  function handleTogglePhotos() {
    setState((s) => ({ ...s, photosEnabled: !s.photosEnabled }));
  }

  // ── Photo handlers ────────────────────────────────────────────────────────
  function handlePhotoUpload(studentId: string, dataUrl: string) {
    if (!period) return;
    mutatePeriod((p) => ({
      ...p,
      roster: p.roster.map((s) => (s.id === studentId ? { ...s, photoDataUrl: dataUrl } : s)),
    }));
  }

  function handlePhotoRemove(studentId: string) {
    if (!period) return;
    mutatePeriod((p) => ({
      ...p,
      roster: p.roster.map((s) =>
        s.id === studentId ? { ...s, photoDataUrl: undefined } : s,
      ),
    }));
  }

  // ── Period metadata ───────────────────────────────────────────────────────
  function handleUpdateMeta(fields: { teacherName?: string; roomNumber?: string }) {
    if (!period) return;
    mutatePeriod((p) => ({ ...p, ...fields }));
  }

  function handleUpdateSubNotes(notes: string) {
    if (!period) return;
    mutatePeriod((p) => ({ ...p, subNotes: notes }));
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type?: string; studentId?: string } | undefined;
    if (data?.type === 'student' && data.studentId) {
      setActiveDragStudent(studentById.get(data.studentId) ?? null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDragStudent(null);
    const { active, over, delta } = e;
    if (!period) return;
    const aData = active.data.current as
      | { type: 'student'; studentId: string; sourceSeatId?: string }
      | { type: 'seat-move'; seatId: string }
      | undefined;
    if (!aData) return;

    // Seat repositioning in layout-edit mode.
    if (aData.type === 'seat-move') {
      const seatId = aData.seatId;
      mutatePeriod((p) => {
        const seats = p.layout.seats.map((seat) => {
          if (seat.id !== seatId) return seat;
          const nx = clampAndSnap(seat.x + delta.x, CANVAS_WIDTH - SEAT_WIDTH);
          const ny = clampAndSnap(seat.y + delta.y, CANVAS_HEIGHT - SEAT_HEIGHT);
          return { ...seat, x: nx, y: ny };
        });
        return { ...p, layout: { ...p.layout, seats } };
      });
      return;
    }

    // Student drag.
    if (aData.type === 'student') {
      if (!over) return;
      const oData = over.data.current as
        | { type: 'seat'; seatId: string }
        | { type: 'roster' }
        | undefined;
      const studentId = aData.studentId;
      const sourceSeatId = aData.sourceSeatId;

      if (oData?.type === 'roster') {
        if (!sourceSeatId) return;
        mutatePeriod((p) => {
          const next = { ...p.assignments };
          delete next[sourceSeatId];
          return { ...p, assignments: next };
        });
        return;
      }

      if (oData?.type === 'seat') {
        const targetSeatId = oData.seatId;
        if (targetSeatId === sourceSeatId) return;
        mutatePeriod((p) => {
          const next = { ...p.assignments };
          const displaced = next[targetSeatId];
          next[targetSeatId] = studentId;
          if (sourceSeatId) {
            if (displaced) {
              next[sourceSeatId] = displaced;
            } else {
              delete next[sourceSeatId];
            }
          }
          for (const [sid, stid] of Object.entries(next)) {
            if (sid !== targetSeatId && stid === studentId) delete next[sid];
          }
          return { ...p, assignments: next };
        });
        return;
      }
    }
  }

  // ── Period management ─────────────────────────────────────────────────────
  function handleSelectPeriod(id: string) {
    setState((s) => ({ ...s, activePeriodId: id }));
    setEditMode(false);
  }

  function handleCreatePeriod(name: string) {
    const p = newPeriod(name, 'rows');
    setState((s) => ({ ...s, periods: [...s.periods, p], activePeriodId: p.id }));
    setEditMode(false);
  }

  function handleRenamePeriod(id: string, name: string) {
    setState((s) => updatePeriod(s, id, (p) => ({ ...p, name })));
  }

  function handleDeletePeriod(id: string) {
    setState((s) => {
      const remaining = s.periods.filter((p) => p.id !== id);
      const nextActive = remaining[0]?.id ?? null;
      return { ...s, periods: remaining, activePeriodId: nextActive };
    });
  }

  function handleSaveRoster(parsed: ParsedStudent[]) {
    if (!period) return;
    mutatePeriod((p) => {
      const byKey = new Map<string, Student>();
      for (const s of p.roster) byKey.set(fullName(s).toLowerCase(), s);
      const seen = new Set<string>();
      const nextRoster: Student[] = [];
      for (const { firstName, lastName } of parsed) {
        const key = fullName({ firstName, lastName }).toLowerCase();
        const existing = byKey.get(key);
        const student = existing ?? { id: genId('stu'), firstName, lastName };
        if (seen.has(student.id)) continue;
        seen.add(student.id);
        nextRoster.push(student);
      }
      const rosterIds = new Set(nextRoster.map((s) => s.id));
      const nextAssignments: Record<string, string> = {};
      for (const [seatId, stuId] of Object.entries(p.assignments)) {
        if (rosterIds.has(stuId)) nextAssignments[seatId] = stuId;
      }
      return { ...p, roster: nextRoster, assignments: nextAssignments };
    });
    setImporting(false);
  }

  function handleClearRoster() {
    if (!period) return;
    if (!confirm('Remove all students from this period? This will clear all seat assignments. (You can re-import.)')) return;
    mutatePeriod((p) => ({ ...p, roster: [], assignments: {}, undoSnapshot: null }));
  }

  function handleShuffle() {
    if (!period || period.roster.length === 0 || period.layout.seats.length === 0) return;
    mutatePeriod((p) => ({
      ...p,
      undoSnapshot: p.assignments,
      assignments: shuffleAssignments(p),
    }));
  }

  function handleReset() {
    if (!period) return;
    if (Object.keys(period.assignments).length === 0) return;
    mutatePeriod((p) => ({ ...p, undoSnapshot: p.assignments, assignments: {} }));
  }

  function handleUndo() {
    if (!period || !period.undoSnapshot) return;
    mutatePeriod((p) => ({ ...p, assignments: p.undoSnapshot ?? {}, undoSnapshot: null }));
  }

  function handleApplyPreset(key: PresetKey) {
    if (!period) return;
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    mutatePeriod((p) => ({ ...p, layout: preset.build(), assignments: {}, undoSnapshot: null }));
  }

  function handleAddSeat() {
    if (!period) return;
    mutatePeriod((p) => {
      const newSeat = {
        id: genId('seat'),
        x: clampAndSnap(CANVAS_WIDTH / 2 - SEAT_WIDTH / 2 + (p.layout.seats.length % 6) * 12, CANVAS_WIDTH - SEAT_WIDTH),
        y: clampAndSnap(CANVAS_HEIGHT / 2 - SEAT_HEIGHT / 2 + (p.layout.seats.length % 6) * 12, CANVAS_HEIGHT - SEAT_HEIGHT),
      };
      return { ...p, layout: { ...p.layout, seats: [...p.layout.seats, newSeat] } };
    });
  }

  function handleRemoveSeat(seatId: string) {
    if (!period) return;
    mutatePeriod((p) => {
      const seats = p.layout.seats.filter((s) => s.id !== seatId);
      const next = { ...p.assignments };
      delete next[seatId];
      return { ...p, layout: { ...p.layout, seats }, assignments: next };
    });
  }

  function handleRotateFront() {
    if (!period) return;
    const order: Orientation[] = ['top', 'right', 'bottom', 'left'];
    mutatePeriod((p) => {
      const idx = order.indexOf(p.layout.frontOfRoom);
      const next = order[(idx + 1) % order.length];
      return { ...p, layout: { ...p.layout, frontOfRoom: next } };
    });
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!period) {
    return (
      <div className="app app--empty">
        <h1>Seating Chart Creator</h1>
        <p>No periods. Click below to create one.</p>
        <button type="button" onClick={() => handleCreatePeriod('Period 1')}>
          Create a period
        </button>
      </div>
    );
  }

  const canUndo = !!period.undoSnapshot;
  const canShuffle = period.roster.length > 0 && period.layout.seats.length > 0;
  const isSubMode = viewMode === 'sub';

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={editMode ? [restrictToParentElement] : undefined}
    >
      <div className="app">
        <header className="app__header">
          <div className="app__brand">
            <h1>Seating Chart Creator</h1>
          </div>
          <div className="app__header-right">
            <SaveIndicator lastSavedAt={lastSavedAt} pending={savePending} />
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          </div>
        </header>

        {/* Storage quota warning */}
        {saveError && (
          <div className="save-error" role="alert">
            ⚠️ Storage quota exceeded — photos may not have saved. Remove some photos to free up space.
          </div>
        )}

        {/* View-mode controls: always visible */}
        <div className="view-mode-bar">
          {/* Segmented control — Editor | Sub mode */}
          <div className="segmented" role="tablist" aria-label="View mode">
            <button
              type="button"
              role="tab"
              className={`segmented__btn${!isSubMode ? ' segmented__btn--active' : ''}`}
              aria-selected={!isSubMode}
              onClick={() => handleSetViewMode('editor')}
            >
              Editor
            </button>
            <button
              type="button"
              role="tab"
              className={`segmented__btn${isSubMode ? ' segmented__btn--active' : ''}`}
              aria-selected={isSubMode}
              onClick={() => handleSetViewMode('sub')}
            >
              Sub mode
            </button>
          </div>

          <div className="view-mode-bar__right">
            {/* Photos toggle */}
            <button
              type="button"
              className={`photos-toggle${photosEnabled ? ' photos-toggle--on' : ''}`}
              aria-pressed={photosEnabled}
              onClick={handleTogglePhotos}
              title={photosEnabled ? 'Photos on — click to hide' : 'Photos off — click to show'}
            >
              📷 Photos: {photosEnabled ? 'on' : 'off'}
            </button>

            {/* Print / PDF — only meaningful when viewing the sub layout */}
            <button
              type="button"
              onClick={() => window.print()}
              className="print-btn"
              aria-label="Open print dialog"
              title="Print or save as PDF"
            >
              🖨 Print / PDF
            </button>
          </div>
        </div>

        {/* Editor chrome — hidden in Sub mode */}
        {!isSubMode && (
          <>
            <PeriodTabs
              periods={state.periods}
              activeId={state.activePeriodId}
              onSelect={handleSelectPeriod}
              onCreate={handleCreatePeriod}
              onRename={handleRenamePeriod}
              onDelete={handleDeletePeriod}
            />
            <Toolbar
              editMode={editMode}
              onToggleEdit={() => setEditMode((v) => !v)}
              onShuffle={handleShuffle}
              onReset={handleReset}
              onUndo={handleUndo}
              canUndo={canUndo}
              canShuffle={canShuffle}
              onApplyPreset={handleApplyPreset}
            />
          </>
        )}

        <main className={`app__main${isSubMode ? ' app__main--sub' : ''}`}>
          {isSubMode ? (
            /* ── Sub mode ── */
            <SubModeView
              period={period}
              studentById={studentById}
              photosEnabled={photosEnabled}
              onUpdateSubNotes={handleUpdateSubNotes}
              readOnly
            />
          ) : (
            /* ── Editor mode ── */
            <>
              <RosterPanel
                students={period.roster}
                unassigned={unassigned}
                onOpenImport={() => setImporting(true)}
                onClearRoster={handleClearRoster}
              />
              <SeatingCanvas
                layout={period.layout}
                studentById={studentById}
                assignments={period.assignments}
                editMode={editMode}
                photosEnabled={photosEnabled}
                teacherName={period.teacherName ?? ''}
                roomNumber={period.roomNumber ?? ''}
                subNotes={period.subNotes ?? ''}
                onRemoveSeat={handleRemoveSeat}
                onAddSeat={handleAddSeat}
                onRotateFront={handleRotateFront}
                onPhotoUpload={handlePhotoUpload}
                onPhotoRemove={handlePhotoRemove}
                onUpdateSubNotes={handleUpdateSubNotes}
                onUpdateMeta={handleUpdateMeta}
              />
            </>
          )}
        </main>

        {importing && (
          <RosterImportModal
            initialStudents={period.roster}
            onCancel={() => setImporting(false)}
            onSave={handleSaveRoster}
          />
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragStudent ? (
          <div className="student-card student-card--overlay">{fullName(activeDragStudent)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function clampAndSnap(value: number, max: number): number {
  const snapped = Math.round(value / GRID_SNAP) * GRID_SNAP;
  return Math.max(0, Math.min(max, snapped));
}
