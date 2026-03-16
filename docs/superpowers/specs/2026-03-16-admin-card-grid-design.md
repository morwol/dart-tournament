# Admin Card Grid — Design Spec

## Goal

Replace the current table/list views for User, Spieler, and Boards in AdminPage with a responsive card grid on desktop (≥768px). Mobile layout stays completely unchanged.

## Architecture

- Each affected tab function adds two inline hook calls (`useState` + `useEffect`) at the top of its function body to track desktop/mobile viewport — no shared hook file or custom hook abstraction needed.
- Each tab conditionally renders either the new card grid (desktop) or the existing list (mobile), switching on the `isDesktop` boolean.
- Inline accordion state (`editId`) is already managed per-tab — no changes needed to state logic, only to the render output.
- No new routes, no API changes, no new files outside AdminPage.jsx.

## Tech Stack

React 18, inline styles (project convention — no CSS modules), PE Corporate Design tokens, existing Zustand + API patterns.

---

## isDesktop Hook Calls (full implementation, copy into each tab)

Add these two hook calls at the top of each affected tab function body (`UsersTab`, `PlayersTab`, `BoardsTab`):

```js
const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
useEffect(() => {
  const mq = window.matchMedia('(min-width: 768px)');
  const handler = (e) => setIsDesktop(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

---

## Per-List Design

### User (UsersTab)

**Grid:** `display: grid`, `gridTemplateColumns: 'repeat(2, 1fr)'`, gap 8px, maxWidth 900px

**Actual field names on each `u` object (from AdminPage.jsx):**
`u.id`, `u.username`, `u.display_name` (server-computed, may be null), `u.vorname`, `u.nickname`, `u.nachname`, `u.role`, `u.active`, `u.email`

Existing constants to reuse (already defined at top of AdminPage.jsx):
- `ROLE_COLORS`: `{ admin: 'var(--pe-danger)', director: 'var(--pe-blue-mid)', referee: 'var(--pe-warning)', gastronomy: 'var(--pe-success)' }`
- `ROLE_LABELS`: `{ admin: 'Admin', director: 'Turnierleitung', referee: 'Schiedsrichter', gastronomy: 'Gastronomie' }`

**Card (collapsed):**
- Left: avatar circle 36×36px
  - Active: gradient bg (`--pe-gradient`), white text — initial = first letter of `u.vorname || u.username` uppercased
  - Inactive (`!u.active`): `--pe-bg-elevated` bg, `--pe-border` border, `--pe-text-muted` text (same initial logic)
- Center: primary = `u.display_name || u.username` (bold, 12px) + `@${u.username}` (muted, 10px, only shown when `u.display_name` is non-null) — matching existing list line 572–573
- Right: role badge pill + ✏️ edit button (opens accordion) + "Deaktivieren" button (danger, only when `u.active`) — all three in a flex row with gap
- Inactive card: entire card at 50% opacity

**Role badge (collapsed):**
Use `ROLE_COLORS[u.role]` as text color. Derive background as `rgba` at 15% opacity, border at 30% opacity:
| Role | Text (`ROLE_COLORS`) | Background | Border |
|------|---------------------|------------|--------|
| admin | `--pe-danger` (#FF4560) | `rgba(255,69,96,0.15)` | `rgba(255,69,96,0.3)` |
| director | `--pe-blue-mid` (#1E7FEB) | `rgba(30,127,235,0.15)` | `rgba(30,127,235,0.3)` |
| referee | `--pe-warning` (#FFB020) | `rgba(255,176,32,0.15)` | `rgba(255,176,32,0.3)` |
| gastronomy | `--pe-success` (#00E5A0) | `rgba(0,229,160,0.15)` | `rgba(0,229,160,0.3)` |
| unknown | `--pe-text-muted` | `rgba(90,115,148,0.15)` | `var(--pe-border)` |

Label text: `ROLE_LABELS[u.role] || u.role`

**"Deaktivieren" button (collapsed card):**
- Shown only when `u.active`; placed in the right flex group after the edit button
- Style: danger (`--pe-danger` text, `--pe-bg-elevated` bg)
- Calls `handleDelete(u.id)` — which uses `confirm()` then `api.del('/users/:id')` (existing function, unchanged)

**Card (expanded — accordion):**
- Border switches to `--pe-cyan-bright`; header (avatar + display name + ✕ button) stays visible at top
- Form fields (match existing `editForm` state populated by `startEdit(u)` — no changes to payload or state):
  1. Vorname / Nickname / Nachname — **3-col grid** (matching existing form layout at line 599–603)
  2. Role dropdown / New Password — 2-col grid
  3. "Speichern" button — full width, PE gradient, calls `handleSaveEdit(u.id)`
- One card expanded at a time (matching existing `editId` state logic)
- No animation — instant expand/collapse

**Empty state:** "Keine User" centered, `--pe-text-muted` (matching existing text)
**Error state:** existing toast pattern unchanged (no separate loading state in `UsersTab`)

---

### Spieler (PlayersTab)

**Grid:** `gridTemplateColumns: 'repeat(3, 1fr)'`, gap 8px, maxWidth 1100px

**Actual field names on each `p` object:**
`p.id`, `p.name` (server-computed display name, always present), `p.vorname`, `p.nickname`, `p.nachname`, `p.seed`, `p.walkon_url`, `p.walkon_youtube`, `p.walkon_start`, `p.walkon_duration`

Walk-on status: `walkonStatuses[p.id]` (fetched from `/walkon/:id/status`)

**Walk-on status values and display:**
| Value | Icon + text | Color |
|-------|-------------|-------|
| `'ready'` | `♪ ready` | `--pe-success` |
| `'downloading'` | `⏳ lädt` | `--pe-warning` |
| `'pending'` | `⏳ lädt` | `--pe-warning` |
| `'error'` | `✗ Fehler` | `--pe-danger` |
| `null` / `undefined` | `♪ —` | `--pe-text-muted` |

Walk-on URL presence check: `p.walkon_url || p.walkon_youtube` (same as existing filter at line 278). If no URL, show `♪ —` muted regardless of `walkonStatuses[p.id]`.

**Card (collapsed):**
- Left: seed circle 36×36px (`--pe-bg-elevated` bg, `--pe-border` border)
  - Seeded (`p.seed`): seed number in `--pe-cyan-bright`, bold 13px
  - Unseeded: `—` in `--pe-text-muted`
- Center: `p.name` (bold 12px, `overflow: hidden`, `textOverflow: ellipsis`, `whiteSpace: nowrap`) — use `p.name` directly, matching existing list at line 443
  + walk-on status line (10px, see table above)
- Right: ✏️ edit button

**Card (expanded — accordion):**
- Header stays (seed circle + `p.name` + ✕ button)
- Form fields match existing `editingPlayer` state, initialized via `setEditingPlayer({id: p.id, vorname: p.vorname||'', nickname: p.nickname||'', nachname: p.nachname||'', walk_on_song: p.walkon_url||p.walkon_youtube||'', walkon_start: p.walkon_start??0, walkon_duration: p.walkon_duration??30})`:
  1. Vorname / Nachname — 2-col
  2. Nickname — full width
  3. Walk-On URL (`editingPlayer.walk_on_song`) — full width
  4. Start / Duration — 2-col, shown only when `editingPlayer.walk_on_song` is non-empty (matching existing conditional at line 407)
  5. "Löschen" button — danger style, `disabled` + `opacity: 0.4` when `isActive`; uses existing `confirm()` dialog (no change to deletion logic)
  6. "Speichern" button — full width, PE gradient, calls `handleEdit()`
- One card expanded at a time

**Tournament auto-selection:** always selects first tournament (`t[0]`) on mount — no active-tournament preference (unlike BoardsTab which prefers the active one).

**Empty state:** "Keine Spieler" centered, `--pe-text-muted` (matching existing text at line 478)
**Loading/error:** match existing patterns

---

### Boards (BoardsTab)

**Grid:** `gridTemplateColumns: 'repeat(4, 1fr)'`, gap 8px, maxWidth 900px

**No accordion** — action buttons always visible directly on card.

**Actual field names on each `b` object:** `b.id`, `b.number`, `b.name`, `b.is_final`, `b.current_game_id`
State variable: `selectedTournamentId` (string). Auto-selects on mount to active tournament or first tournament; `''` only if API returns zero tournaments.

**Card border:** `b.is_final ? '1px solid var(--pe-warning)' : '1px solid var(--pe-border)'` — matching existing list at line 188.

**Card layout (top to bottom, centered):**
1. 🎯 emoji (22px)
2. `Board ${b.number}` (bold 13px)
3. `b.name` if non-empty (muted 10px), else nothing
4. Status badges (stacked, centered, gap 4px):
   - `● Aktiv` (`--pe-success`, `rgba(0,229,160,0.15)` bg) if `b.current_game_id`, else `Frei` (`--pe-text-muted`, `rgba(90,115,148,0.15)` bg)
   - `★ Final` (`--pe-warning`, `rgba(255,176,32,0.15)` bg) — only rendered if `b.is_final`
5. Action row (two buttons side by side, full width):
   - Final toggle button — matching existing style at line 209:
     - `b.is_final`: `background: 'var(--pe-warning)'`, `color: '#000'`, label "★ Final"
     - Not final: `background: 'var(--pe-bg-elevated)'`, `color: 'var(--pe-text-sub)'`, label "Als Final markieren"
     - Disabled (opacity 0.4, not-allowed cursor) when `!b.is_final && boards.some(x => x.is_final && x.id !== b.id)`
     - Calls `api.put('/boards/:id/final', { is_final: !b.is_final })` then `loadBoards()`
   - "Löschen" button — danger style (`--pe-danger` text); uses `confirm()` then delete API

**Pre-selection / empty states:**
- `selectedTournamentId === ''` (only when API returns zero tournaments): "Keine Turniere vorhanden." centered, muted
- Tournament selected, `boards.length === 0`: "Keine Boards für dieses Turnier." centered, muted
**Loading/error:** match existing patterns

---

## Responsive Behavior

- **≥768px:** Card grid as above (`isDesktop === true`)
- **<768px:** Existing render output untouched (`isDesktop === false`, falls through to current JSX)
- The inline hook calls are copy-pasted three times — once per tab function. No shared abstraction.

## Files to Change

- `frontend/src/pages/AdminPage.jsx` only — `UsersTab`, `PlayersTab`, `BoardsTab` render sections

## Out of Scope

- No changes to GastronomyAdminTab, TournamentTab, OverviewTab, or any other tab
- No changes to API, data fetching, or state logic
- No new files
- No changes to mobile layout
