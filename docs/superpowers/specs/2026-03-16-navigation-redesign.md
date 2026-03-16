# Navigation Redesign — Design Spec
**Date:** 2026-03-16
**Status:** Approved via interactive mockup (nav-mockup.html)

---

## Problem

The current navigation is massively inconsistent across pages:

- `GastronomyPage` has a **double header** — one from AppShell (TopBar) plus its own internal header with BackButton + logo
- `RefereePage` is inside AppShell and gets TopBar + RoleTabs, even though a referee only enters scores and never navigates away from their board
- `AdminPage` is completely outside AppShell with its own sidebar navigation — a different paradigm from everything else
- `RoleTabs` links to `/referee` which does not exist as a route in `App.jsx`
- `CurrentGameView`, `NFCScanPage`, `OrderPage` have no shell at all
- No unified navigation pattern for either mobile or desktop

---

## Decisions (all confirmed via mockup)

| Question | Decision |
|---|---|
| Mobile navigation position | **Bottom navigation bar** |
| Desktop navigation | **Top navigation bar** (horizontal, below TopBar) |
| Explicit mobile/desktop variants | **Yes** — different layouts per breakpoint |
| Referee entry flow | **Option B** — `/referee` login → board picker → `/referee/:boardId` |
| Admin navigation | **Integrated into AppShell** — sidebar removed |

---

## Architecture

### AppShell — Unified Shell for all authenticated + public routes

All routes (except referee board) use one AppShell:
- **TopBar** (64px, sticky): logo left, role pill + avatar right; back-button + title on sub-pages
- **Mobile** (`< 768px`): `BottomNav` component (80px, fixed, role-based tabs)
- **Desktop** (`≥ 768px`): `TopNav` component (48px, horizontal tabs, below TopBar)
- **Content area**: fills remaining space, scrollable, `padding-bottom: 96px` on mobile to clear bottom nav
- **Nav suppression**: AppShell suppresses both `BottomNav` and `TopNav` when `useMatch('/referee')` matches — referee picker has TopBar but no tab nav

### Routes

```
AppShell routes (TopBar + role nav):
  /                          → HomePage         (all roles)
  /tournament/:id            → TournamentPage   (sub-page: back button, no tab nav)
  /tournament/:id/register   → PlayerRegistrationPage (sub-page)
  /gastronomy                → GastronomyPage   (gastronomy, admin)
  /admin                     → AdminPage        (admin, director)
  /admin/users               → AdminPage        (admin — NOT a sub-page, full nav shown)

Referee shell (TopBar only, nav suppressed via useMatch):
  /referee                   → RefereeEntryPage (login form → board picker)

Referee standalone (NO shell at all):
  /referee/:boardId          → RefereePage (existing component, extracted board logic)

Other standalone (no shell — unchanged):
  /board/:boardId            → CurrentGameView
  /nfc / /nfc-scan           → NFCScanPage
  /orders/:uid               → OrderPage
  /cancel/:token             → CancelRegistrationPage
```

---

## Role-based Navigation

### Mobile Bottom Nav (tabs per role)

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|---|---|---|---|---|
| public | 🏠 Home → `/` | 🎯 Turnier → `/` | — | — |
| referee | 📋 Boards → `/referee` | 🏆 Turnier → `/` | — | — |
| gastronomy | 🛒 Bestellung → `/gastronomy` | 💶 Kasse → `/gastronomy?tab=kasse` | 📦 Produkte → `/gastronomy?tab=products` | 📡 NFC → `/nfc-scan` |
| admin | 📊 Übersicht → `/admin` | 🏆 Turniere → `/admin?tab=tournaments` | 🎯 Boards → `/admin?tab=boards` | ⚙️ Admin → `/admin?tab=settings` |
| director | 📊 Übersicht → `/admin` | 🏆 Turniere → `/admin?tab=tournaments` | 👥 Spieler → `/admin?tab=players` | 🎯 Boards → `/admin?tab=boards` |

### Desktop Top Nav (all items visible, scrollable if needed)

| Role | Items (path) |
|---|---|
| public | Home `/`, Turnier `/` |
| referee | Meine Boards `/referee`, Turnier `/` |
| gastronomy | Bestellungen `/gastronomy`, Kasse `/gastronomy?tab=kasse`, Produkte `/gastronomy?tab=products`, NFC `/nfc-scan` |
| admin | Übersicht `/admin`, Turnierleiter `/admin?tab=director`, Turniere `/admin?tab=tournaments`, Spieler `/admin?tab=players`, Boards `/admin?tab=boards`, Gastro `/gastronomy`, User `/admin?tab=users`, Mailing `/admin?tab=mailing`, Settings `/admin?tab=settings`, System-Log `/admin?tab=log`, Hilfe `/admin?tab=help` |
| director | Übersicht `/admin`, Turniere `/admin?tab=tournaments`, Spieler `/admin?tab=players`, Boards `/admin?tab=boards`, System-Log `/admin?tab=log` |

---

## TopBar Behaviour

- **Root pages:** Logo left · spacer · role pill · avatar (opens logout dropdown)
- **Sub-pages** (`/tournament/:id`, `/tournament/:id/register`): `←` back button left (64px tap target) · page title centered · role pill · avatar
- **Referee board** (`/referee/:boardId`): No TopBar at all
- **Referee login/picker** (`/referee`): TopBar with logo + avatar; no BottomNav/TopNav rendered

---

## Auth + Zustand Integration (critical)

All login flows must call `useStore().setToken(token)` after successful authentication — not just `localStorage.setItem`. The Zustand store exposes `setToken` (not `login`). This is required for AppShell's role-based nav to reflect the correct role.

Affected pages:
- **GastronomyPage**: `GastronomyLogin.handleSubmit` currently calls `localStorage.setItem` + local `setToken` state only. Must also call `useStore().setToken(token)` so `role` is set in the store.
- **RefereeEntryPage** (new): after successful login, call `useStore().setToken(token)` (in addition to `localStorage.setItem`).
- **AdminPage**: already uses Zustand (`useStore`) for login — no change needed.

---

## Referee Flow

```
/referee  (AppShell shell, TopBar only, no tab nav)
  └─ Not logged in → login form (username + password)
       └─ Login success:
            - localStorage.setItem('token', token)
            - useStore().login(token)   ← sets role in Zustand
            → board picker view (same page, state toggle)
                  Each board card shows:
                    - Board number + name
                    - Game status (● running / ⏳ waiting / idle)
                    - Assigned referee name if occupied → card blocked (red, not clickable)
                    - "Frei" (cyan) if no referee assigned
                  Tap free board → navigate to /referee/:boardId

/referee/:boardId  (fully standalone — no AppShell, no TopBar, no nav)
  Current component: RefereePage.jsx — login gate removed, token state cleaned up:
    - Remove `const [token, setToken] = useState(...)` and early return guard
    - Remove `<RefereeLogin>` component (moved to RefereeEntryPage)
    - Replace `onLogout={() => setToken(null)}` prop with `useStore().logout()`
  ├─ Player cards (side by side):
  │    Active: cyan border, gradient score, "Anwurf" badge + "▶ Am Zug" badge
  │    Inactive: 45% opacity, muted score
  ├─ "📋 N Spiele" chip (top-left, low-profile) → queue view (in-page toggle)
  ├─ Modifier bar: [Single] [Double] [Triple]
  ├─ Number grid: 1–20 (5 columns × 4 rows)
  ├─ Special row: [Bull 25] [D-Bull 50] [Miss]
  ├─ Action row: [↩ Undo] [current selection display] [✓ Confirm]
  └─ "← Turnier verlassen" (bottom, 50% opacity)

Queue view (in-page toggle within /referee/:boardId, no navigation):
  ├─ ← back to score entry (state toggle)
  ├─ Current game (running, start disabled)
  ├─ Ready games (both players present → "Starten")
  ├─ Missing-player games (warning → "Überspringen")
  └─ Not-yet-schedulable games (disabled)
```

---

## AdminPage Tab Integration

`AdminPage` renders content based on an `activeTab` state. After the sidebar is removed, tab switching is driven by URL search params (`?tab=...`), consistent with existing patterns in the codebase (`/admin?tab=boards` already exists in `RoleTabs`).

- `AdminPage` reads `activeTab` from `useSearchParams()` (replace internal `useState` for tab)
- The existing `tab` prop passed from `/admin/users` route becomes `?tab=users` in the URL — the ProtectedRoute for `/admin/users` becomes a redirect to `/admin?tab=users`
- `AdminDashboard`'s own header (gradient header + username + logout) is removed — TopBar handles this
- `AdminDashboard`'s mobile tile-grid and desktop sidebar are removed — BottomNav/TopNav handle this
- Internal `showMobileTiles` state and `selectTab` function are removed
- All tab content components (OverviewTab, TournamentsTab, etc.) are unchanged

---

## GastronomyPage "Kasse" Tab

The "Kasse" view is currently an internal `view` state toggle (`'order'` vs `'register'`). After the redesign it becomes a URL-driven tab, consistent with AdminPage's `?tab=` pattern:

- `/gastronomy` → `view = 'order'` (Bestellung)
- `/gastronomy?tab=kasse` → `view = 'register'` (Kasse)
- `/gastronomy?tab=products` → products management (existing)

`GastronomyPage` reads `tab` from `useSearchParams()` to set its internal `view` state on mount + when params change.

---

## Changes per File

### Modify

| File | Change |
|---|---|
| `GastronomyPage.jsx` | (1) Remove internal header (BackButton + logo + title). (2) Replace local `token` auth state with `useStore()` — call `useStore().login(token)` on successful login. (3) Read `?tab` from `useSearchParams()` to drive `view` state. |
| `AdminPage.jsx` | (1) Remove gradient header, sidebar, mobile tile-grid, `showMobileTiles` state, `selectTab` function. (2) Replace `activeTab` useState with `useSearchParams()`. (3) Remove `tab` prop — use URL param instead. |
| `App.jsx` | (1) Move `/referee/:boardId` out of AppShell to standalone. (2) Add `/referee` as standalone route → `RefereeEntryPage`. (3) Move `/admin` into AppShell wrapped in `<ProtectedRoute roles={['admin','director']}>` — currently `/admin` is unguarded at the router level; the internal admin login gate is removed when the sidebar goes. (4) Replace `/admin/users` ProtectedRoute with a `<Navigate to="/admin?tab=users" replace />`. |
| `AppShell.jsx` | (1) Replace `<RoleTabs />` with `<BottomNav />` (mobile) + `<TopNav />` (desktop). (2) Add nav suppression: `const isRefereeEntry = useMatch('/referee')` → skip nav components when true. |
| `RoleTabs.jsx` | Delete file. Replaced by `BottomNav.jsx` + `TopNav.jsx`. |

### New Files

| File | Purpose |
|---|---|
| `components/BottomNav.jsx` | Mobile bottom navigation, role-based, 80px fixed, `env(safe-area-inset-bottom)` |
| `components/TopNav.jsx` | Desktop top navigation, role-based, 48px, horizontal tabs, scrollable |
| `pages/RefereeEntryPage.jsx` | Standalone at `/referee`: login form + board picker (no AppShell nav below TopBar) |

### Unchanged

- `TopBar.jsx` — no changes
- `BackButton.jsx` — still used inside pages
- `RefereePage.jsx` — board logic stays, login gate removed (login now in `RefereeEntryPage`)
- All standalone routes (`/board`, `/nfc`, `/orders`, `/cancel`) — no changes

---

## Design Constraints

- Font: Verdana, Geneva, sans-serif — no exceptions
- Mobile breakpoint: `< 768px` → BottomNav; `≥ 768px` → TopNav
- Touch targets: minimum 64px on all interactive nav elements
- Bottom nav height: 80px + `env(safe-area-inset-bottom)`
- Active tab indicator: 2px cyan top border on mobile bottom nav; 2px cyan bottom border on desktop top nav
- Inactive tab color: `--pe-text-muted`; active: `--pe-cyan-bright`
- All PE CSS design tokens — no hardcoded colors
