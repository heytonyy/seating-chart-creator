# Seating Chart Creator

A web app for teachers to build, save, and rearrange classroom seating charts via drag-and-drop. Replaces the manual Google-Docs-table workaround that many teachers currently use.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build → dist/
npm run preview  # serve the production build
```

Requires Node 18+.

## Features

- **Custom room layouts.** Pick a preset (Rows, Clusters of 4, U-shape, Paired desks) or start from a blank canvas. In **Edit layout** mode, drag seats to reposition, click **+ Add seat**, or remove with the × button. Rotate the "front of room" indicator with one click.
- **Roster import.** Paste names one-per-line or upload a CSV. The CSV parser uses the first two columns as first and last name, auto-detects a header row, and supports quoted fields with embedded commas. See [`roster-example.csv`](./roster-example.csv) for the format.
- **Drag-and-drop assignment.** Drag a card from the roster onto a seat. Drag between seats to swap. Drag back to the roster panel to unassign. Drop targets light up during drag.
- **Shuffle / Reset / Undo.** One-click random assignment, one-click clear, single-step undo for both.
- **Multiple periods.** Each class period is its own chart with its own roster and layout. Switch via tabs at the top; double-click a tab to rename.
- **Auto-save.** Every edit is debounced and written to `localStorage`. The header shows save status ("Saving…" / "Auto-saved Xs ago").
- **Dark mode.** Follows the system's `prefers-color-scheme` on first load. Toggle in the top-right to override; the choice is remembered.
- **Keyboard accessible.** Tab to focus a student card or seat, Space to pick up, arrow keys to move, Space to drop. ARIA labels describe seat/roster state.

## CSV format

The first two columns are read as first and last name. A header row whose first cell contains "name" is skipped. Additional columns are ignored.

```csv
First Name,Last Name
Alan,Turing
John,von Neumann
Grace,Hopper
```

Pasted text in the import modal works the same way: each line becomes one student. Lines with a comma split on the comma; otherwise the first space separates first from last ("John von Neumann" → "John" / "von Neumann").

## Project structure

```
src/
  App.tsx                          top-level state, DndContext, handlers
  main.tsx                         React entrypoint
  types.ts                         Period, Student, Seat, Layout, AppState
  state.ts                         period helpers, shuffle, roster parsing
  storage.ts                       localStorage load/save + legacy migration
  layouts.ts                       preset generators (rows, clusters, U, paired)
  theme.ts                         light/dark detection + persistence
  styles.css                       all styles, with `[data-theme="dark"]` palette
  components/
    PeriodTabs.tsx                 period switcher (create / rename / delete)
    Toolbar.tsx                    edit-layout toggle, presets, shuffle/reset/undo
    RosterPanel.tsx                left sidebar of unassigned students
    StudentCard.tsx                draggable card (single-line in roster, two-line + font-scaled on seats)
    SeatBox.tsx                    droppable + (in edit mode) draggable seat
    SeatingCanvas.tsx              positioned grid of seats + edit toolbar
    RosterImportModal.tsx          paste / CSV import dialog
    SaveIndicator.tsx              "Auto-saved…" status pill
    ThemeToggle.tsx                sun/moon icon button
```

## Data model

```ts
interface Student   { id: string; firstName: string; lastName: string }
interface Seat      { id: string; x: number; y: number }
interface Layout    { seats: Seat[]; frontOfRoom: 'top' | 'bottom' | 'left' | 'right' }
interface Period    {
  id: string;
  name: string;
  layout: Layout;
  roster: Student[];
  assignments: Record<string, string>;  // seatId -> studentId
  undoSnapshot: Record<string, string> | null;
  updatedAt: number;
}
interface AppState  { periods: Period[]; activePeriodId: string | null }
```

Persistence: `localStorage` key `seating-chart-creator:v1`. A migration in `storage.ts` converts older `{id, name}` student records to `{id, firstName, lastName}` on load, so existing data keeps working.

## Tech stack

- **React 18** + **TypeScript** + **Vite**
- **[@dnd-kit/core](https://dndkit.com/)** for accessible drag-and-drop (pointer + keyboard sensors), **@dnd-kit/modifiers** for the in-canvas `restrictToParentElement` constraint
- **CSS variables** for the light/dark palette, no styling framework
- **`localStorage`** for persistence — no backend

## Deployment (Heroku from GitHub)

The repo is set up for Heroku's auto-detected Node.js buildpack:

- `Procfile` — runs `npm start` on the web dyno
- `package.json` `engines.node` pins Node 20
- `heroku-postbuild` runs `npm run build` after install (so devDeps like `vite` and `typescript` are still available to build); Heroku then prunes devDeps before booting the dyno
- `npm start` runs `serve -s dist -l $PORT` to serve the built static files with SPA fallback

To deploy:

1. Push this repo to GitHub.
2. In the Heroku Dashboard, create a new app → **Deploy** tab → **Deployment method: GitHub** → connect the repo.
3. Enable **Automatic deploys** from `main` (or click **Deploy Branch** for a one-off).
4. Heroku detects the Node buildpack from `package.json`, runs install + `heroku-postbuild`, then boots `web: npm start`. No buildpack or config var setup is required.

No environment variables are needed — all state lives in the user's browser (`localStorage`).

## Roadmap

- **Story 1** — MVP, dark mode, CSV name formatting
- **Story 2** — student photos on seats, substitute-facing read-only view, print/PDF export
- **Story 3** — accommodation flags with indicator dots, free-text per-student notes, "do not seat together" pair flags with adjacency warnings