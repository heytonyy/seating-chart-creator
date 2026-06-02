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
import type { AccommodationId, AppState, Layout, Orientation, Period, Seat, Student } from './types';
import { genId, loadState, saveState } from './storage';
import {
  emptyState,
  findPeriod,
  fullName,
  newPeriod,
  shuffleWithConstraints,
  updatePeriod,
  type ParsedStudent,
} from './state';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRID_SNAP,
  PRESETS,
  SEAT_HEIGHT,
  SEAT_WIDTH,
  type PresetKey,
} from './layouts';
import { PeriodTabs } from './components/PeriodTabs';
import { RosterPanel } from './components/RosterPanel';
import { SeatingCanvas } from './components/SeatingCanvas';
import { Toolbar } from './components/Toolbar';
import { RosterImportModal } from './components/RosterImportModal';
import { SaveIndicator } from './components/SaveIndicator';
import { ThemeToggle } from './components/ThemeToggle';
import { SubModeView } from './components/SubModeView';
import { StudentDetailsPanel } from './components/StudentDetailsPanel';
import { ImpossibleConstraintsModal } from './components/ImpossibleConstraintsModal';
import { applyTheme, getInitialTheme, getStoredTheme, storeTheme, type Theme } from './theme';

const AUTOSAVE_DEBOUNCE_MS = 500;

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    if (loaded) return loaded;
    return { ...emptyState(), viewMode: 'editor', photosEnabled: true };
  });
  const [editMode, setEditMode] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeDragStudent, setActiveDragStudent] = useState<Student | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // ── Story 3: ephemeral UI state (never persisted) ──────────────────────
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  /** Private view hides all flag data; resets on page reload. */
  const [privateView, setPrivateView] = useState(false);

  // ── v4: layout snapshot taken on entering edit mode (transient, §3.4) ──
  const [layoutSnapshot, setLayoutSnapshot] = useState<Layout | null>(null);
  /** Shown when constraint-aware shuffle finds no valid arrangement (§4.7). */
  const [showImpossible, setShowImpossible] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => {
    const t = getInitialTheme();
    applyTheme(t);
    return t;
  });

  // Follow system dark/light changes when no override is stored.
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

  // ── Auto-save ──────────────────────────────────────────────────────────
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

  // ── Esc key: close details panel ──────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedStudentId) setSelectedStudentId(null);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedStudentId]);

  // ── Derived state ──────────────────────────────────────────────────────
  const period = findPeriod(state);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
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

  // Auto-deselect if selected student is no longer seated
  useEffect(() => {
    if (!selectedStudentId || !period) return;
    const isSeated = Object.values(period.assignments).includes(selectedStudentId);
    if (!isSeated) setSelectedStudentId(null);
  }, [period, selectedStudentId]);

  const viewMode = state.viewMode ?? 'editor';
  const photosEnabled = state.photosEnabled ?? true;
  const isSubMode = viewMode === 'sub';

  // ── v4: revert availability (live layout differs from edit-entry snapshot) ─
  const canRevert = useMemo(() => {
    if (!editMode || !layoutSnapshot || !period) return false;
    return !layoutsEqual(period.layout, layoutSnapshot);
  }, [editMode, layoutSnapshot, period]);

  // ── Helpers ────────────────────────────────────────────────────────────
  function mutatePeriod(mut: (p: Period) => Period) {
    if (!period) return;
    setState((s) => updatePeriod(s, period.id, mut));
  }

  // ── v4: edit-mode entry/exit manages the layout snapshot ────────────────
  function exitEditMode() {
    setEditMode(false);
    setLayoutSnapshot(null);
  }

  function handleToggleEdit() {
    setEditMode((prev) => {
      const next = !prev;
      // Snapshot on entry; discard on exit (§3.4).
      setLayoutSnapshot(next && period ? deepCopyLayout(period.layout) : null);
      return next;
    });
    setSelectedStudentId(null);
  }

  function handleRevertLayout() {
    if (!period || !layoutSnapshot) return;
    const snapshot = layoutSnapshot;
    const snapSeatIds = new Set(snapshot.seats.map((s) => s.id));
    mutatePeriod((p) => {
      // Drop assignments to seats that were added during this edit session;
      // they vanish on revert. Seats removed during the session reappear empty.
      const assignments: Record<string, string> = {};
      for (const [seatId, studentId] of Object.entries(p.assignments)) {
        if (snapSeatIds.has(seatId)) assignments[seatId] = studentId;
      }
      return { ...p, layout: deepCopyLayout(snapshot), assignments };
    });
  }

  // ── View mode ──────────────────────────────────────────────────────────
  function handleSetViewMode(mode: 'editor' | 'sub') {
    setState((s) => ({ ...s, viewMode: mode }));
    if (mode === 'sub') {
      exitEditMode();
      setSelectedStudentId(null);
    }
  }

  function handleTogglePhotos() {
    setState((s) => ({ ...s, photosEnabled: !s.photosEnabled }));
  }

  // ── Story 3: selection ────────────────────────────────────────────────
  function handleSelectStudent(id: string) {
    setSelectedStudentId((prev) => (prev === id ? null : id));
  }

  function handleDeselectStudent() {
    setSelectedStudentId(null);
  }

  // ── Story 3: accommodations ───────────────────────────────────────────
  function handleUpdateAccommodations(studentId: string, ids: AccommodationId[]) {
    if (!period) return;
    mutatePeriod((p) => ({
      ...p,
      roster: p.roster.map((s) => (s.id === studentId ? { ...s, accommodations: ids } : s)),
    }));
  }

  // ── Story 3: notes ────────────────────────────────────────────────────
  function handleUpdateStudentNotes(studentId: string, notes: string) {
    if (!period) return;
    mutatePeriod((p) => ({
      ...p,
      roster: p.roster.map((s) => (s.id === studentId ? { ...s, notes } : s)),
    }));
  }

  // ── Story 3: pair flags ───────────────────────────────────────────────
  function handleAddPairFlag(idA: string, idB: string) {
    if (!period) return;
    const [a, b] = [idA, idB].sort();
    const exists = (period.pairFlags ?? []).some((f) => f.studentA === a && f.studentB === b);
    if (exists) return;
    mutatePeriod((p) => ({
      ...p,
      pairFlags: [...(p.pairFlags ?? []), { studentA: a, studentB: b }],
    }));
  }

  function handleRemovePairFlag(idA: string, idB: string) {
    if (!period) return;
    const [a, b] = [idA, idB].sort();
    mutatePeriod((p) => ({
      ...p,
      pairFlags: (p.pairFlags ?? []).filter((f) => !(f.studentA === a && f.studentB === b)),
    }));
  }

  // ── Photo handlers ────────────────────────────────────────────────────
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

  // ── Period metadata ───────────────────────────────────────────────────
  function handleUpdateMeta(fields: { teacherName?: string; roomNumber?: string }) {
    if (!period) return;
    mutatePeriod((p) => ({ ...p, ...fields }));
  }

  function handleUpdateSubNotes(notes: string) {
    if (!period) return;
    mutatePeriod((p) => ({ ...p, subNotes: notes }));
  }

  // ── Drag & drop ───────────────────────────────────────────────────────
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
            if (displaced) next[sourceSeatId] = displaced;
            else delete next[sourceSeatId];
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

  // ── Period management ─────────────────────────────────────────────────
  function handleSelectPeriod(id: string) {
    setState((s) => ({ ...s, activePeriodId: id }));
    exitEditMode();
    setSelectedStudentId(null);
  }

  function handleCreatePeriod(name: string) {
    const p = newPeriod(name, 'rows');
    setState((s) => ({ ...s, periods: [...s.periods, p], activePeriodId: p.id }));
    exitEditMode();
    setSelectedStudentId(null);
  }

  function handleRenamePeriod(id: string, name: string) {
    setState((s) => updatePeriod(s, id, (p) => ({ ...p, name })));
  }

  function handleDeletePeriod(id: string) {
    setState((s) => {
      const remaining = s.periods.filter((p) => p.id !== id);
      return { ...s, periods: remaining, activePeriodId: remaining[0]?.id ?? null };
    });
    setSelectedStudentId(null);
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
        // Preserve existing student (with photo, accommodations, notes) if name matches
        const student = existing ?? {
          id: genId('stu'),
          firstName,
          lastName,
          accommodations: [],
          notes: '',
        };
        if (seen.has(student.id)) continue;
        seen.add(student.id);
        nextRoster.push(student);
      }
      const rosterIds = new Set(nextRoster.map((s) => s.id));
      const nextAssignments: Record<string, string> = {};
      for (const [seatId, stuId] of Object.entries(p.assignments)) {
        if (rosterIds.has(stuId)) nextAssignments[seatId] = stuId;
      }
      // Cascade-delete pair flags for removed students
      const nextPairFlags = (p.pairFlags ?? []).filter(
        (f) => rosterIds.has(f.studentA) && rosterIds.has(f.studentB),
      );
      return { ...p, roster: nextRoster, assignments: nextAssignments, pairFlags: nextPairFlags };
    });
    setImporting(false);
  }

  function handleClearRoster() {
    if (!period) return;
    if (!confirm('Remove all students from this period? This will clear all seat assignments. (You can re-import.)')) return;
    mutatePeriod((p) => ({ ...p, roster: [], assignments: {}, undoSnapshot: null, pairFlags: [] }));
    setSelectedStudentId(null);
  }

  function handleShuffle() {
    if (!period || period.roster.length === 0 || period.layout.seats.length === 0) return;
    // Constraint-aware: silently re-rolls / backtracks until a valid arrangement
    // is found. Returns null only when none exists (§4.7).
    const next = shuffleWithConstraints(period);
    if (next === null) {
      setShowImpossible(true);
      return; // chart unchanged
    }
    mutatePeriod((p) => ({ ...p, undoSnapshot: p.assignments, assignments: next }));
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
      const newSeat: Seat = {
        id: genId('seat'),
        x: clampAndSnap(CANVAS_WIDTH / 2 - SEAT_WIDTH / 2 + (p.layout.seats.length % 6) * 12, CANVAS_WIDTH - SEAT_WIDTH),
        y: clampAndSnap(CANVAS_HEIGHT / 2 - SEAT_HEIGHT / 2 + (p.layout.seats.length % 6) * 12, CANVAS_HEIGHT - SEAT_HEIGHT),
        rotation: 0,
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

  function handleRotateSeat(seatId: string) {
    if (!period) return;
    mutatePeriod((p) => {
      const seats = p.layout.seats.map((s) =>
        s.id === seatId ? { ...s, rotation: (((s.rotation + 90) % 360) as Seat['rotation']) } : s,
      );
      return { ...p, layout: { ...p.layout, seats } };
    });
  }

  function handleRotateFront() {
    if (!period) return;
    const order: Orientation[] = ['top', 'right', 'bottom', 'left'];
    mutatePeriod((p) => {
      const idx = order.indexOf(p.layout.frontOfRoom);
      return { ...p, layout: { ...p.layout, frontOfRoom: order[(idx + 1) % order.length] } };
    });
  }

  // ── Empty state ───────────────────────────────────────────────────────
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
  const selectedStudent = selectedStudentId ? studentById.get(selectedStudentId) ?? null : null;

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

        {saveError && (
          <div className="save-error" role="alert">
            ⚠️ Storage quota exceeded — photos may not have saved. Remove some photos to free up space.
          </div>
        )}

        {/* ── View-mode bar ─────────────────────────────────────────────── */}
        <div className="view-mode-bar">
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
            {/* Story 3: private view toggle — only in editor mode */}
            {!isSubMode && (
              <label className="private-view-toggle">
                <input
                  type="checkbox"
                  checked={privateView}
                  onChange={(e) => {
                    setPrivateView(e.target.checked);
                    if (e.target.checked) setSelectedStudentId(null);
                  }}
                  aria-pressed={privateView}
                />
                Private view — teacher only
              </label>
            )}
            <button
              type="button"
              className={`photos-toggle${photosEnabled ? ' photos-toggle--on' : ''}`}
              aria-pressed={photosEnabled}
              onClick={handleTogglePhotos}
              title={photosEnabled ? 'Photos on — click to hide' : 'Photos off — click to show'}
            >
              📷 Photos: {photosEnabled ? 'on' : 'off'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="print-btn"
              aria-label="Open print dialog"
            >
              🖨 Print / PDF
            </button>
          </div>
        </div>

        {/* Editor chrome */}
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
              onToggleEdit={handleToggleEdit}
              onShuffle={handleShuffle}
              onReset={handleReset}
              onUndo={handleUndo}
              canUndo={canUndo}
              canShuffle={canShuffle}
              onApplyPreset={handleApplyPreset}
            />
          </>
        )}

        <main className={`app__main${isSubMode ? ' app__main--sub' : ''}${selectedStudent ? ' app__main--panel-open' : ''}`}>
          {isSubMode ? (
            <SubModeView
              period={period}
              studentById={studentById}
              photosEnabled={photosEnabled}
              onUpdateSubNotes={handleUpdateSubNotes}
              readOnly
            />
          ) : (
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
                privateView={privateView}
                selectedStudentId={selectedStudentId}
                teacherName={period.teacherName ?? ''}
                roomNumber={period.roomNumber ?? ''}
                subNotes={period.subNotes ?? ''}
                onRemoveSeat={handleRemoveSeat}
                onRotateSeat={handleRotateSeat}
                onAddSeat={handleAddSeat}
                onRotateFront={handleRotateFront}
                onRevertLayout={handleRevertLayout}
                canRevert={canRevert}
                onPhotoUpload={handlePhotoUpload}
                onPhotoRemove={handlePhotoRemove}
                onUpdateSubNotes={handleUpdateSubNotes}
                onUpdateMeta={handleUpdateMeta}
                onSelectStudent={handleSelectStudent}
                onDeselectStudent={handleDeselectStudent}
              />
              {/* Right-rail details panel */}
              {selectedStudent && !editMode && (
                <StudentDetailsPanel
                  student={selectedStudent}
                  period={period}
                  studentById={studentById}
                  photosEnabled={photosEnabled}
                  savePending={savePending}
                  onClose={handleDeselectStudent}
                  onUpdateAccommodations={handleUpdateAccommodations}
                  onUpdateNotes={handleUpdateStudentNotes}
                  onAddPairFlag={handleAddPairFlag}
                  onRemovePairFlag={handleRemovePairFlag}
                />
              )}
            </>
          )}
        </main>

        {importing && (
          <RosterImportModal
            initialStudents={period.roster}
            roster={period.roster}
            pairFlags={period.pairFlags ?? []}
            onAddPairFlag={handleAddPairFlag}
            onRemovePairFlag={handleRemovePairFlag}
            onCancel={() => setImporting(false)}
            onSave={handleSaveRoster}
          />
        )}

        {showImpossible && (
          <ImpossibleConstraintsModal onClose={() => setShowImpossible(false)} />
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

/** Deep copy of a layout for the edit-mode revert snapshot (§3.4). */
function deepCopyLayout(layout: Layout): Layout {
  return { frontOfRoom: layout.frontOfRoom, seats: layout.seats.map((s) => ({ ...s })) };
}

/** Structural equality of two layouts (seats compared by position + rotation). */
function layoutsEqual(a: Layout, b: Layout): boolean {
  if (a.frontOfRoom !== b.frontOfRoom) return false;
  if (a.seats.length !== b.seats.length) return false;
  const bById = new Map(b.seats.map((s) => [s.id, s]));
  for (const seat of a.seats) {
    const other = bById.get(seat.id);
    if (!other) return false;
    if (other.x !== seat.x || other.y !== seat.y || other.rotation !== seat.rotation) return false;
  }
  return true;
}
