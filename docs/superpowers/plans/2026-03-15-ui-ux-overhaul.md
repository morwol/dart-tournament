# UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a persistent AppShell with role-aware TopBar + tab navigation, unified back button pattern, and polished hover/transition animations across the DartEvent Manager PWA.

**Architecture:** A new `AppShell` layout route wraps all shell pages (HomePage, TournamentPage, PlayerRegistrationPage, RefereePage, GastronomyPage) and renders a persistent `TopBar` + `RoleTabs`. Standalone pages (Admin, CurrentGameView, NFC, Orders, Cancel) remain unwrapped. Role is extracted from JWT on login and persisted in Zustand via localStorage.

**Tech Stack:** React 18, react-router-dom v6, Zustand, TailwindCSS, PE Corporate Design tokens, pure CSS transitions (no animation library)

**Spec:** `docs/superpowers/specs/2026-03-15-ui-ux-overhaul-design.md`

---

## Chunk 1: Foundation — Store & CSS Utilities

Files touched:
- Modify: `frontend/src/store/index.js`
- Modify: `frontend/src/App.jsx` (extract `parseJwt` to shared util)
- Create: `frontend/src/lib/parseJwt.js`
- Modify: `frontend/src/index.css`

---

### Task 1: Extract `parseJwt` to shared utility

`parseJwt` currently lives in `App.jsx` (line 18–22) but is needed in `store/index.js`. Extract it first so both files can import it.

**Files:**
- Create: `frontend/src/lib/parseJwt.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create the lib directory and utility file**

```bash
mkdir -p /home/moritzwolf/dartsturnier/frontend/src/lib
```

```js
// frontend/src/lib/parseJwt.js
export function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}
```

- [ ] **Step 2: Update App.jsx to import instead of define**

In `frontend/src/App.jsx`, replace lines 17–22:
```js
// Remove this block:
// NEU: JWT Payload dekodieren (ohne Verifikation — Verifikation passiert im Backend)
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}
```
Add import at top of file (after existing imports):
```js
import { parseJwt } from './lib/parseJwt';
```

- [ ] **Step 3: Verify the app still starts**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run dev
```
Open `http://localhost:5173` — homepage must load without console errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/parseJwt.js frontend/src/App.jsx
git commit -m "refactor: extract parseJwt to shared utility"
```

---

### Task 2: Add `role` to Zustand store

**Files:**
- Modify: `frontend/src/store/index.js`

- [ ] **Step 1: Update the store**

Replace the entire contents of `frontend/src/store/index.js`:

```js
import { create } from 'zustand';
import { parseJwt } from '../lib/parseJwt';

export const useStore = create((set) => ({
  token: localStorage.getItem('token'),
  role:  parseJwt(localStorage.getItem('token'))?.role ?? null,
  admin: null,

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, role: parseJwt(token)?.role ?? null });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, role: null, admin: null });
  },

  currentTournament: null,
  setCurrentTournament: (t) => set({ currentTournament: t }),
}));
```

- [ ] **Step 2: Verify role is populated after login**

Start dev server. Open browser DevTools console. Log in as admin/referee/gastro. Run:
```js
window.__zustand = require('./store').useStore.getState()
```
Or simply check: after login, hard-refresh the page — the role pill (added in Task 5) should still appear.

For now, verify no console errors on startup:
```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/index.js
git commit -m "feat: add role field to Zustand store, persist from JWT via localStorage"
```

---

### Task 3: Add global CSS animation utilities

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Append utilities to index.css**

Open `frontend/src/index.css` and append at the end of the file:

```css
/* ─── PE Interactive Utilities ─────────────────────────────── */

/* Hover: interactive cards (tournament, player, board cards) */
.pe-card-interactive {
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  cursor: pointer;
}
.pe-card-interactive:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 4px 20px rgba(0, 184, 255, 0.12);
}
.pe-card-interactive:active {
  transform: scale(0.98);
}

/* Hover: buttons */
.pe-btn {
  transition: border-color 150ms ease, color 150ms ease,
              background 150ms ease, transform 150ms ease;
}
.pe-btn:hover {
  border-color: var(--pe-cyan-bright);
  color: var(--pe-cyan-bright);
}
.pe-btn:active {
  transform: scale(0.97);
}

/* Page entry animation (applied to shell page root divs) */
.pe-page-enter {
  animation: pe-fade-in 200ms ease forwards;
}
@keyframes pe-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Hide scrollbar utility (for RoleTabs) */
.pe-scrollbar-hide {
  scrollbar-width: none;       /* Firefox */
  -ms-overflow-style: none;    /* IE/Edge */
}
.pe-scrollbar-hide::-webkit-scrollbar {
  display: none;               /* Chrome/Safari */
}
```

- [ ] **Step 2: Verify no CSS errors**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run dev
```
Open browser, check DevTools console — no CSS parse errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add pe-card-interactive, pe-btn, pe-page-enter CSS utilities"
```

---

## Chunk 2: New Components — TopBar, RoleTabs, AppShell

Files touched:
- Create: `frontend/src/components/TopBar.jsx`
- Create: `frontend/src/components/RoleTabs.jsx`
- Create: `frontend/src/components/AppShell.jsx`

---

### Task 4: Build `TopBar` component

The TopBar has two states controlled by props:
- **Root state** (`isSubPage=false`): logo left, role pill + avatar right
- **Sub-page state** (`isSubPage=true`): ← back icon left, page title center, avatar right

**Files:**
- Create: `frontend/src/components/TopBar.jsx`

- [ ] **Step 1: Create TopBar.jsx**

```jsx
// frontend/src/components/TopBar.jsx
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

const ROLE_PILL = {
  referee:    { bg: 'rgba(255,176,32,0.15)',  color: 'var(--pe-warning)',      border: 'rgba(255,176,32,0.3)',  label: 'Referee' },
  gastronomy: { bg: 'rgba(0,229,160,0.15)',   color: 'var(--pe-success)',      border: 'rgba(0,229,160,0.3)',   label: 'Gastro' },
  admin:      { bg: 'rgba(0,184,255,0.15)',   color: 'var(--pe-cyan-bright)',  border: 'rgba(0,184,255,0.3)',   label: 'Admin' },
  director:   { bg: 'rgba(0,184,255,0.15)',   color: 'var(--pe-cyan-bright)',  border: 'rgba(0,184,255,0.3)',   label: 'Director' },
};

export default function TopBar({ isSubPage = false, title = '', onBack }) {
  const navigate = useNavigate();
  const { role, logout } = useStore();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const pill = role ? ROLE_PILL[role] : null;
  const initials = role ? role.slice(0, 1).toUpperCase() : '?';

  return (
    <header style={{
      height: '64px',
      background: 'var(--pe-bg-elevated)',
      borderBottom: '1px solid var(--pe-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: '8px',
      flexShrink: 0,
      fontFamily: 'Verdana, Geneva, sans-serif',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {isSubPage ? (
        /* Sub-page: ← back icon — 64×64px tap area via padding around 40px visual icon */
        <button
          onClick={handleBack}
          aria-label="Zurück"
          style={{
            padding: '12px',           /* 12+40+12 = 64px tap area */
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--pe-text-sub)',
            fontSize: '22px',
            flexShrink: 0,
            transition: 'color 150ms ease',
            borderRadius: '8px',
            margin: '0 0 0 -12px',    /* align visually with edge */
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--pe-cyan-bright)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--pe-text-sub)'}
        >
          ←
        </button>
      ) : (
        /* Root: logo */
        <span style={{
          fontSize: '14px',
          fontWeight: 'bold',
          background: 'var(--pe-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          flexShrink: 0,
        }}>
          DartEvent
        </span>
      )}

      {/* Center: page title (sub-page) or spacer (root) */}
      <div style={{ flex: 1, textAlign: isSubPage ? 'center' : 'left' }}>
        {isSubPage && (
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--pe-text)' }}>
            {title}
          </span>
        )}
      </div>

      {/* Right: role pill (root only) + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {!isSubPage && pill && (
          <span style={{
            background: pill.bg,
            color: pill.color,
            border: `1px solid ${pill.border}`,
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}>
            {pill.label}
          </span>
        )}
        {role && (
          <button
            onClick={handleLogout}
            title="Abmelden"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--pe-gradient)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'Verdana, Geneva, sans-serif',
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {initials}
          </button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify no import errors**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build 2>&1 | head -30
```
Expected: no errors mentioning `TopBar.jsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TopBar.jsx
git commit -m "feat: add TopBar component with root/sub-page states and role pill"
```

---

### Task 5: Build `RoleTabs` component

**Files:**
- Create: `frontend/src/components/RoleTabs.jsx`

- [ ] **Step 1: Create RoleTabs.jsx**

```jsx
// frontend/src/components/RoleTabs.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public:     [
    { label: 'Home',    path: '/' },
    { label: 'Turnier', path: '/tournament' },
  ],
  referee:    [
    { label: 'Boards',  path: '/referee' },
    { label: 'Turnier', path: '/tournament' },
  ],
  gastronomy: [
    { label: 'Bestellungen', path: '/gastronomy' },
    { label: 'Produkte',     path: '/gastronomy?tab=products' },
    { label: 'NFC',          path: '/nfc-scan' },
  ],
  admin: [
    { label: 'Home',    path: '/' },
    { label: 'Turnier', path: '/tournament' },
    { label: 'Boards',  path: '/admin?tab=boards' },
    { label: 'Gastro',  path: '/gastronomy' },
    { label: 'Admin',   path: '/admin' },
  ],
  director: [
    { label: 'Home',    path: '/' },
    { label: 'Turnier', path: '/tournament' },
    { label: 'Boards',  path: '/admin?tab=boards' },
    { label: 'Spieler', path: '/admin?tab=players' },
  ],
};

export default function RoleTabs() {
  const { role } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = TABS[role] ?? TABS.public;

  const isActive = (path) => {
    const base = path.split('?')[0];
    if (base === '/') return pathname === '/';
    return pathname.startsWith(base);
  };

  return (
    <nav
      className="pe-scrollbar-hide"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 12px',
        background: 'var(--pe-bg-card)',
        borderBottom: '1px solid var(--pe-border)',
        overflowX: 'auto',
        flexShrink: 0,
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            style={{
              minHeight: '64px',
              padding: '0 14px',
              background: 'none',
              border: 'none',
              borderBottom: active ? '2px solid var(--pe-cyan-bright)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: active ? 'bold' : 'normal',
              color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
              whiteSpace: 'nowrap',
              transition: 'color 150ms ease, border-color 150ms ease',
              fontFamily: 'Verdana, Geneva, sans-serif',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-sub)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-muted)'; }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
```

**Note on tab height:** `minHeight: '64px'` per spec (CLAUDE.md mandatory minimum for all interactive elements).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/RoleTabs.jsx
git commit -m "feat: add RoleTabs component with role-aware tab sets"
```

---

### Task 6: Build `AppShell` component

AppShell is the layout route. It determines from the current URL whether to show the root state (Logo + Tabs) or sub-page state (← + Title).

**Files:**
- Create: `frontend/src/components/AppShell.jsx`

- [ ] **Step 1: Create AppShell.jsx**

```jsx
// frontend/src/components/AppShell.jsx
import { Outlet, useMatch } from 'react-router-dom';
import TopBar from './TopBar';
import RoleTabs from './RoleTabs';

function useSubPage() {
  const registerMatch = useMatch('/tournament/:id/register');
  const tournamentMatch = useMatch('/tournament/:id');

  if (registerMatch) return { isSubPage: true, title: 'Anmelden' };
  if (tournamentMatch) return { isSubPage: true, title: 'Turnier-Detail' };
  return { isSubPage: false, title: '' };
}

export default function AppShell() {
  const { isSubPage, title } = useSubPage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar isSubPage={isSubPage} title={title} />
      {!isSubPage && <RoleTabs />}
      <main className="pe-page-enter" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/AppShell.jsx
git commit -m "feat: add AppShell layout component with TopBar and RoleTabs"
```

---

## Chunk 3: Route Restructure — App.jsx

Files touched:
- Modify: `frontend/src/App.jsx`

---

### Task 7: Restructure App.jsx to nested layout routes

This is the highest-risk task. The entire `<Routes>` tree changes. Do this carefully.

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add AppShell import**

In `frontend/src/App.jsx`, add to the import block at the top:
```js
import AppShell from './components/AppShell';
```

- [ ] **Step 2: Replace the Routes block**

Replace the `<Routes>...</Routes>` block inside the `App()` function (currently lines 80–100) with:

```jsx
<Routes>
  {/* ── Shell routes: persistent TopBar + RoleTabs ── */}
  <Route element={<AppShell />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/tournament/:id" element={<TournamentPage />} />
    <Route path="/tournament/:id/register" element={<PlayerRegistrationPage />} />
    <Route path="/referee/:boardId" element={<RefereePage />} />
    <Route path="/gastronomy" element={<GastronomyPage />} />
  </Route>

  {/* ── Standalone routes: no shell ── */}
  <Route path="/admin/users" element={<AdminPage tab="users" />} />
  <Route path="/admin" element={<AdminPage />} />
  <Route path="/board/:boardId" element={<CurrentGameView />} />
  <Route path="/nfc" element={<NFCScanPage />} />
  <Route path="/nfc-scan" element={<NFCScanPage />} />
  <Route path="/orders/:uid" element={<OrderPage />} />
  <Route path="/cancel/:token" element={<CancelRegistrationPage />} />
</Routes>
```

- [ ] **Step 3: Verify all routes render correctly**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run dev
```

Check each route manually in the browser:

| URL | Expected |
|-----|---------|
| `http://localhost:5173/` | HomePage with TopBar + public tabs |
| `http://localhost:5173/tournament/1` | TournamentPage with ← "Turnier-Detail" in TopBar |
| `http://localhost:5173/tournament/1/register` | PlayerRegistrationPage with ← "Anmelden" |
| `http://localhost:5173/admin` | AdminPage WITHOUT TopBar shell |
| `http://localhost:5173/board/1` | CurrentGameView WITHOUT TopBar shell |
| `http://localhost:5173/cancel/test` | CancelRegistrationPage WITHOUT TopBar shell |

- [ ] **Step 4: Verify build passes**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build 2>&1 | tail -10
```
Expected: `✓ built in X.XXs` — no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: restructure App.jsx to nested layout routes with AppShell"
```

---

## Chunk 4: Page Cleanup + Color Fixes + Touch Targets

Files touched:
- Modify: `frontend/src/pages/TournamentPage.jsx`
- Modify: `frontend/src/pages/PlayerRegistrationPage.jsx`
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/pages/GastronomyPage.jsx`
- Modify: `frontend/src/pages/CurrentGameView.jsx`

---

### Task 8: Remove `BackButton` usage from shell pages

`TournamentPage` and `PlayerRegistrationPage` are now inside AppShell — TopBar handles back navigation. Remove the BackButton import and usage from both.

**Files:**
- Modify: `frontend/src/pages/TournamentPage.jsx`
- Modify: `frontend/src/pages/PlayerRegistrationPage.jsx`

- [ ] **Step 1: Remove BackButton from TournamentPage**

In `frontend/src/pages/TournamentPage.jsx`:
1. Remove the `import BackButton from '../components/BackButton';` line
2. Remove the `<BackButton />` JSX element (line ~37)

- [ ] **Step 2: Remove BackButton from PlayerRegistrationPage**

In `frontend/src/pages/PlayerRegistrationPage.jsx`:
1. Remove `import BackButton from '../components/BackButton';` if present
2. Remove inline `←` back link elements (lines ~79 and ~138 — plain text arrows)
   These look like: `<a onClick={() => navigate(-1)} style={{...}}>← Zurück</a>` or similar

- [ ] **Step 3: Verify pages still render**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run dev
```
Navigate to `/tournament/1` — TournamentPage should have TopBar with ← and no second back button.
Navigate to `/tournament/1/register` — same, single ← in TopBar.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TournamentPage.jsx frontend/src/pages/PlayerRegistrationPage.jsx
git commit -m "refactor: remove BackButton usages from shell pages — TopBar handles back nav"
```

---

### Task 9: Apply `pe-card-interactive` to cards in HomePage

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx`

- [ ] **Step 1: Add className to tournament cards**

Find the tournament/player/board card elements in `HomePage.jsx`. These are typically `<div>` elements with `style={{ background: 'var(--pe-bg-card)', border: ... }}`. Add `className="pe-card-interactive"` to each card wrapper.

Look for the pattern and add the class:
```jsx
// Before
<div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', ... }}>

// After
<div className="pe-card-interactive" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', ... }}>
```

Apply to: tournament list items, player list items, board list items.

- [ ] **Step 2: Add `pe-btn` to FAB buttons**

Find the FAB buttons (lines ~691–706) and add `className="pe-btn"` to each.

- [ ] **Step 3: Fix hardcoded gradient (line 391)**

Find line 391 in `HomePage.jsx`:
```js
// Before (hardcoded):
background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB, #1A4FD6)'

// After (PE token):
background: 'var(--pe-gradient)'
```

- [ ] **Step 4: Fix search input touch target (line ~180)**

Find the search input and add `minHeight: '64px'`:
```jsx
// Before:
style={{ padding: '12px 14px', ... }}

// After:
style={{ padding: '12px 14px', minHeight: '64px', ... }}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HomePage.jsx
git commit -m "feat: add hover animations to cards and FABs, fix hardcoded gradient"
```

---

### Task 10: Fix hardcoded colors in GastronomyPage + touch targets

**Files:**
- Modify: `frontend/src/pages/GastronomyPage.jsx`

- [ ] **Step 1: Fix `'#fff'` hardcodes (lines 46 and 357)**

```js
// Before:
color: '#fff'

// After:
color: 'var(--pe-text)'
```

Apply to lines 46 and 357 only. **Do not change line 72** — that is `color: '#000'` (black text on a green success button, intentional contrast).

- [ ] **Step 2: Fix category button touch target (line ~496)**

```jsx
// Before:
style={{ minHeight: '48px', ... }}

// After:
style={{ minHeight: '64px', ... }}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/GastronomyPage.jsx
git commit -m "fix: replace hardcoded colors with PE tokens in GastronomyPage, fix touch targets"
```

---

### Task 11: Fix hardcoded colors in CurrentGameView + PlayerRegistrationPage

**Files:**
- Modify: `frontend/src/pages/CurrentGameView.jsx`
- Modify: `frontend/src/pages/PlayerRegistrationPage.jsx`

- [ ] **Step 1: Fix CurrentGameView (lines 140, 152)**

In `frontend/src/pages/CurrentGameView.jsx`, find lines 140 and 152:
```js
// Before:
background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB, #1A4FD6)'

// After:
background: 'var(--pe-gradient)'
```

- [ ] **Step 2: Fix PlayerRegistrationPage (lines 124, 206)**

```js
// Before:
color: '#fff'

// After:
color: 'var(--pe-text)'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CurrentGameView.jsx frontend/src/pages/PlayerRegistrationPage.jsx
git commit -m "fix: replace hardcoded colors with PE tokens in CurrentGameView and PlayerRegistrationPage"
```

---

### Task 12: Final acceptance check

- [ ] **Step 1: Build check**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build 2>&1 | tail -10
```
Expected: clean build, no errors.

- [ ] **Step 2: Manual acceptance criteria walkthrough**

Start the full dev stack:
```bash
cd /home/moritzwolf/dartsturnier && npm run dev   # or start backend + frontend separately
```

Walk through each acceptance criterion from the spec:

| Check | How to verify |
|-------|--------------|
| AppShell wraps shell routes only | Visit `/`, `/tournament/1`, `/gastronomy` → TopBar visible. Visit `/admin`, `/board/1` → no TopBar |
| TopBar root state | Visit `/` → Logo + no role pill (public), or role pill after login |
| TopBar sub-page state | Visit `/tournament/1` → ← icon + "Turnier-Detail" |
| ← touch target ≥ 64px | DevTools → inspect ← button → computed height must be ≥ 64px |
| RoleTabs per role | Log in as referee → see Boards + Turnier tabs only |
| Role persists after hard refresh | Login, F5 → role pill still shown |
| Hover on cards | Hover tournament cards → subtle lift + glow |
| Page fade-in | Navigate between routes → 200ms fade-in visible |
| Touch targets ≥ 64px | DevTools inspect tabs, search input, category buttons |
| No hardcoded colors | Search codebase: `grep -r "'#fff'" frontend/src/pages/` → only non-critical hits remain |
| BackButton removed from shell pages | Visit `/tournament/1` → only one ← (in TopBar), no duplicate |

- [ ] **Step 3: Create follow-up GitHub issues**

```bash
gh issue create --title "refactor: unify back navigation on standalone pages (cancel/orders/nfc)" \
  --body "Follow-up to #30. CancelRegistrationPage, OrderPage, NFCScanPage still use their own inline back navigation. Unify with a shared pattern." \
  --label "enhancement"

gh issue create --title "feat: replace alert() with toast notifications in GastronomyPage and RefereePage" \
  --body "Follow-up to #30. GastronomyPage (lines 144, 191, 225, 244) uses browser alert(). Replace with in-app toast component." \
  --label "enhancement"

gh issue create --title "security: activate ProtectedRoute for admin/referee/gastro routes" \
  --body "Follow-up to #30. Frontend route guards are not active. ProtectedRoute component exists in App.jsx but is unused. Harden with proper redirect behavior." \
  --label "security"
```

- [ ] **Step 4: Final commit + push**

```bash
git add -p   # review any remaining unstaged changes
git push origin fix/board-view-fixes
```

---

## File Map Summary

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/lib/parseJwt.js` | CREATE | Shared JWT decode utility |
| `frontend/src/components/TopBar.jsx` | CREATE | Persistent top bar, root + sub-page states |
| `frontend/src/components/RoleTabs.jsx` | CREATE | Role-aware horizontal tab navigation |
| `frontend/src/components/AppShell.jsx` | CREATE | Layout route wrapper |
| `frontend/src/store/index.js` | MODIFY | Add `role` field + localStorage init |
| `frontend/src/App.jsx` | MODIFY | Nested route structure + parseJwt import |
| `frontend/src/index.css` | MODIFY | Add pe-card-interactive, pe-btn, pe-page-enter |
| `frontend/src/pages/TournamentPage.jsx` | MODIFY | Remove BackButton |
| `frontend/src/pages/PlayerRegistrationPage.jsx` | MODIFY | Remove inline ← links + fix colors |
| `frontend/src/pages/HomePage.jsx` | MODIFY | Add card hover classes, fix gradient, fix search touch target |
| `frontend/src/pages/GastronomyPage.jsx` | MODIFY | Fix #fff colors + category button touch target |
| `frontend/src/pages/CurrentGameView.jsx` | MODIFY | Fix hardcoded gradients |
| `components/BackButton.jsx` | DEPRECATED | Keep file, no usages in shell pages |
