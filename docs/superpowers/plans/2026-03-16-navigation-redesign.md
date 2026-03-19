# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inconsistent per-page navigation with a unified AppShell: role-based bottom nav on mobile, top nav on desktop, and a fully standalone referee board screen.

**Architecture:** A new `BottomNav` + `TopNav` component pair replaces `RoleTabs` inside `AppShell`. All authenticated page routes (including Admin) move into AppShell. Referee board stays fully standalone (no shell). A new `RefereeEntryPage` handles login + board picker at `/referee`.

**Tech Stack:** React 18, react-router-dom v6 (`useSearchParams`, `useMatch`, `useNavigate`), Zustand (`useStore`), Vite dev server for verification (no test runner — all verification is visual via browser).

**Spec:** `docs/superpowers/specs/2026-03-16-navigation-redesign.md`
**Mockup:** `frontend/public/nav-mockup.html` (reference for visual targets)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `frontend/src/components/BottomNav.jsx` | Mobile bottom nav — role-based tabs, 80px fixed, active indicator |
| `frontend/src/components/TopNav.jsx` | Desktop top nav — role-based tabs, 48px, horizontal scrollable |
| `frontend/src/pages/RefereeEntryPage.jsx` | `/referee` — login form + board picker, no nav row |

### Modified files
| File | What changes |
|---|---|
| `frontend/src/components/AppShell.jsx` | Swap `RoleTabs` for `BottomNav`+`TopNav`; suppress nav at `/referee` |
| `frontend/src/App.jsx` | Restructure routes: Admin into shell + ProtectedRoute, Referee standalone, `/referee` added |
| `frontend/src/pages/RefereePage.jsx` | Remove login gate + token state; wire `useStore().logout()` |
| `frontend/src/pages/GastronomyPage.jsx` | Remove double header; fix auth to use `useStore().setToken`; `useSearchParams` for tab |
| `frontend/src/pages/AdminPage.jsx` | Remove sidebar/header/tile-grid; `useSearchParams` for active tab with role guard |

### Deleted files
| File | Reason |
|---|---|
| `frontend/src/components/RoleTabs.jsx` | Replaced by BottomNav + TopNav |

---

## Chunk 1: New Navigation Components (BottomNav + TopNav)

### Task 1: Create `BottomNav.jsx`

**Files:**
- Create: `frontend/src/components/BottomNav.jsx`

- [ ] **Step 1: Create the file**

```jsx
// frontend/src/components/BottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public:     [
    { icon: '🏠', label: 'Home',       path: '/' },
    { icon: '🎯', label: 'Turnier',    path: '/' },
  ],
  referee:    [
    { icon: '📋', label: 'Boards',     path: '/referee' },
    { icon: '🏆', label: 'Turnier',    path: '/' },
  ],
  gastronomy: [
    { icon: '🛒', label: 'Bestellung', path: '/gastronomy' },
    { icon: '💶', label: 'Kasse',      path: '/gastronomy?tab=kasse' },
    { icon: '📦', label: 'Produkte',   path: '/gastronomy?tab=products' },
    { icon: '📡', label: 'NFC',        path: '/nfc-scan' },
  ],
  admin:      [
    { icon: '📊', label: 'Übersicht',  path: '/admin' },
    { icon: '🏆', label: 'Turniere',   path: '/admin?tab=tournaments' },
    { icon: '🎯', label: 'Boards',     path: '/admin?tab=boards' },
    { icon: '⚙️', label: 'Admin',      path: '/admin?tab=settings' },
  ],
  director:   [
    { icon: '📊', label: 'Übersicht',  path: '/admin' },
    { icon: '🏆', label: 'Turniere',   path: '/admin?tab=tournaments' },
    { icon: '👥', label: 'Spieler',    path: '/admin?tab=players' },
    { icon: '🎯', label: 'Boards',     path: '/admin?tab=boards' },
  ],
};

// tabs param: the current role's tab list — needed to correctly detect query-variant tabs
function isTabActive(tab, pathname, search, tabs) {
  const [tabBase, tabQuery] = tab.path.split('?');
  if (tabBase === '/') return pathname === '/' && !search;
  if (tabQuery) return pathname.startsWith(tabBase) && search === '?' + tabQuery;
  // If any other tab in THIS role's list shares the same base path with a query string,
  // and that query-variant is currently active, then this base-only tab is NOT active.
  const hasQueryVariant = tabs.some(
    t => { const [b, q] = t.path.split('?'); return q && b === tabBase && search === '?' + q; }
  );
  if (hasQueryVariant) return false;
  return pathname.startsWith(tabBase);
}

export default function BottomNav() {
  const { role } = useStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const tabs = TABS[role] ?? TABS.public;

  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(80px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--pe-bg-elevated)',
        borderTop: '1px solid var(--pe-border)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 100,
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab, pathname, search, tabs);
        return (
          <button
            key={tab.path + tab.label}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              borderTop: active ? '2px solid var(--pe-cyan-bright)' : '2px solid transparent',
              cursor: 'pointer',
              padding: '0 4px 8px',
              fontFamily: 'Verdana, Geneva, sans-serif',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/BottomNav.jsx
git commit -m "feat: add BottomNav component (mobile role-based bottom navigation)"
```

---

### Task 2: Create `TopNav.jsx`

**Files:**
- Create: `frontend/src/components/TopNav.jsx`

- [ ] **Step 1: Create the file**

```jsx
// frontend/src/components/TopNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public:     [
    { label: 'Home',          path: '/' },
    { label: 'Turnier',       path: '/' },
  ],
  referee:    [
    { label: 'Meine Boards',  path: '/referee' },
    { label: 'Turnier',       path: '/' },
  ],
  gastronomy: [
    { label: 'Bestellungen',  path: '/gastronomy' },
    { label: 'Kasse',         path: '/gastronomy?tab=kasse' },
    { label: 'Produkte',      path: '/gastronomy?tab=products' },
    { label: 'NFC',           path: '/nfc-scan' },
  ],
  admin:      [
    { label: 'Übersicht',     path: '/admin' },
    { label: 'Turnierleiter', path: '/admin?tab=director' },
    { label: 'Turniere',      path: '/admin?tab=tournaments' },
    { label: 'Spieler',       path: '/admin?tab=players' },
    { label: 'Boards',        path: '/admin?tab=boards' },
    { label: 'Gastro',        path: '/gastronomy' },
    { label: 'User',          path: '/admin?tab=users' },
    { label: 'Mailing',       path: '/admin?tab=mailing' },
    { label: 'Settings',      path: '/admin?tab=settings' },
    { label: 'System-Log',    path: '/admin?tab=log' },
    { label: 'Hilfe',         path: '/admin?tab=help' },
  ],
  director:   [
    { label: 'Übersicht',     path: '/admin' },
    { label: 'Turniere',      path: '/admin?tab=tournaments' },
    { label: 'Spieler',       path: '/admin?tab=players' },
    { label: 'Boards',        path: '/admin?tab=boards' },
    { label: 'System-Log',    path: '/admin?tab=log' },
  ],
};

// tabs param: the current role's tab list — needed to correctly detect query-variant tabs
function isTabActive(tab, pathname, search, tabs) {
  const [tabBase, tabQuery] = tab.path.split('?');
  if (tabBase === '/') return pathname === '/' && !search;
  if (tabQuery) return pathname.startsWith(tabBase) && search === '?' + tabQuery;
  const hasQueryVariant = tabs.some(
    t => { const [b, q] = t.path.split('?'); return q && b === tabBase && search === '?' + q; }
  );
  if (hasQueryVariant) return false;
  return pathname.startsWith(tabBase);
}

export default function TopNav() {
  const { role } = useStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const tabs = TABS[role] ?? TABS.public;

  return (
    <nav
      aria-label="Hauptnavigation"
      className="pe-scrollbar-hide"
      style={{
        background: 'var(--pe-bg-card)',
        borderBottom: '1px solid var(--pe-border)',
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        padding: '0 8px',
        height: '48px',
        flexShrink: 0,
        overflowX: 'auto',
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab, pathname, search, tabs);
        return (
          <button
            key={tab.path + tab.label}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '0 14px',
              height: '100%',
              background: 'none',
              border: 'none',
              borderBottom: active ? '2px solid var(--pe-cyan-bright)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: active ? 'bold' : 'normal',
              color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
              whiteSpace: 'nowrap',
              fontFamily: 'Verdana, Geneva, sans-serif',
              transition: 'color 150ms ease, border-color 150ms ease',
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/TopNav.jsx
git commit -m "feat: add TopNav component (desktop role-based top navigation)"
```

---

## Chunk 2: Referee Entry Page + AppShell + Route Restructure

> **Note on task order:** `RefereeEntryPage` (Task 3) is created before `App.jsx` is modified (Task 4) to avoid a broken import at dev server startup.

### Task 3: Create `RefereeEntryPage.jsx`

**Files:**
- Create: `frontend/src/pages/RefereeEntryPage.jsx`

This page lives at `/referee` inside AppShell (TopBar shown, no nav row). Two internal states: logged-out (login form) and logged-in (board picker).

- [ ] **Step 1: Confirm Zustand store has `setToken` (not `login`)**

Run: `grep -n "setToken\|logout" frontend/src/store/index.js`
Expected output contains: `setToken:` and `logout:` — these are the correct method names. The spec references `login()` in one place but the actual store uses `setToken`. Use `setToken` throughout.

Also confirm `logout` calls `localStorage.removeItem`:
Expected output: `localStorage.removeItem('token')` inside the `logout` action.

- [ ] **Step 2: Create the file**

```jsx
// frontend/src/pages/RefereeEntryPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api/client';
import { useToastStore } from '../store/toasts';

// ── Login form ──────────────────────────────────────────────────────────────
function RefereeLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', form);
      if (!['admin', 'director', 'referee'].includes(data.user?.role)) {
        setError('Keine Berechtigung für den Referee-Bereich.');
        return;
      }
      localStorage.setItem('token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    background: 'var(--pe-bg-card)',
    border: '1px solid var(--pe-border)',
    color: 'var(--pe-text)',
    fontFamily: 'Verdana, Geneva, sans-serif',
    minHeight: '52px',
    borderRadius: '12px',
    padding: '0 16px',
    width: '100%',
    outline: 'none',
    fontSize: '16px',
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Verdana, Geneva, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: '24px',
          fontSize: '18px',
          background: 'var(--pe-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
        }}>
          Referee Login
        </h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="Benutzername"
            style={inp}
          />
          <input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Passwort"
            style={inp}
          />
          {error && (
            <p style={{ color: 'var(--pe-danger)', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !form.username || !form.password}
            style={{
              background: 'var(--pe-gradient)',
              color: 'var(--pe-text)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              minHeight: '56px',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Board picker ────────────────────────────────────────────────────────────
function BoardPicker() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/boards')
      .then(setBoards)
      .catch(() => addToast({ type: 'error', message: 'Boards konnten nicht geladen werden' }))
      .finally(() => setLoading(false));
  }, []);

  const cardStyle = (occupied) => ({
    background: 'var(--pe-bg-card)',
    border: `1px solid ${occupied ? 'var(--pe-danger)' : 'var(--pe-border)'}`,
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: occupied ? 'not-allowed' : 'pointer',
    opacity: occupied ? 0.65 : 1,
    fontFamily: 'Verdana, Geneva, sans-serif',
    transition: 'border-color 120ms',
  });

  const badge = (text, color, bg, border) => (
    <span style={{
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 'bold',
      color,
      background: bg,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {text}
    </span>
  );

  if (loading) return (
    <p style={{ textAlign: 'center', color: 'var(--pe-text-sub)', padding: '32px' }}>
      Lade Boards...
    </p>
  );

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '16px',
      fontFamily: 'Verdana, Geneva, sans-serif',
    }}>
      <p style={{
        fontSize: '10px',
        color: 'var(--pe-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '14px',
      }}>
        Board auswählen
      </p>
      {boards.map((board) => {
        const occupied = !!board.referee_name;
        return (
          <div
            key={board.id}
            style={cardStyle(occupied)}
            onClick={() => { if (!occupied) navigate(`/referee/${board.number}`); }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--pe-text)' }}>
                Board {board.number}
              </div>
              {board.name && (
                <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '2px' }}>
                  {board.name}
                </div>
              )}
              {board.current_game && (
                <div style={{ fontSize: '11px', color: 'var(--pe-success)', marginTop: '3px' }}>
                  ● {board.current_game}
                </div>
              )}
              {occupied && (
                <div style={{ fontSize: '11px', color: 'var(--pe-danger)', marginTop: '2px' }}>
                  🔒 Referee: {board.referee_name}
                </div>
              )}
              {!occupied && !board.current_game && (
                <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '3px' }}>
                  Kein Referee zugewiesen
                </div>
              )}
            </div>
            {occupied
              ? badge('Belegt', 'var(--pe-danger)',      'rgba(255,69,96,0.12)',  'rgba(255,69,96,0.3)')
              : badge('Frei',   'var(--pe-cyan-bright)', 'rgba(0,184,255,0.12)', 'rgba(0,184,255,0.3)')}
          </div>
        );
      })}
      {!loading && boards.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--pe-text-muted)', padding: '32px' }}>
          Keine Boards eingerichtet.
        </p>
      )}
    </div>
  );
}

// ── Entry point ─────────────────────────────────────────────────────────────
export default function RefereeEntryPage() {
  const { setToken, token } = useStore();

  const handleLogin = (newToken) => {
    setToken(newToken);  // updates localStorage + Zustand role → AppShell nav re-renders
  };

  if (!token) return <RefereeLogin onLogin={handleLogin} />;
  return <BoardPicker />;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/RefereeEntryPage.jsx
git commit -m "feat: add RefereeEntryPage (login + board picker at /referee)"
```

---

### Task 4: Refactor `AppShell.jsx`

**Files:**
- Modify: `frontend/src/components/AppShell.jsx`

- [ ] **Step 1: Replace the entire file content**

```jsx
// frontend/src/components/AppShell.jsx
import { Outlet, useMatch } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import TopNav from './TopNav';

function useSubPage() {
  const registerMatch = useMatch('/tournament/:id/register');
  const tournamentMatch = useMatch('/tournament/:id');
  if (registerMatch) return { isSubPage: true, title: 'Anmelden' };
  if (tournamentMatch) return { isSubPage: true, title: 'Turnier-Detail' };
  return { isSubPage: false, title: '' };
}

export default function AppShell() {
  const { isSubPage, title } = useSubPage();
  // /referee: TopBar only, no nav row (board picker context)
  const isRefereeEntry = useMatch('/referee');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar isSubPage={isSubPage} title={title} />

      {/* Desktop top nav — hidden on mobile, hidden at /referee and on sub-pages */}
      {!isSubPage && !isRefereeEntry && (
        <div className="desktop-nav-only">
          <TopNav />
        </div>
      )}

      <main className="pe-page-enter" style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — hidden on desktop, hidden at /referee and on sub-pages */}
      {!isSubPage && !isRefereeEntry && (
        <div className="mobile-nav-only">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add responsive CSS to global stylesheet**

Find the global CSS file:
```bash
ls frontend/src/*.css
```
Open the file found (likely `index.css`) and append:
```css
/* Desktop top nav: visible only on ≥768px */
.desktop-nav-only { display: none; }
@media (min-width: 768px) {
  .desktop-nav-only { display: block; }
}

/* Mobile bottom nav: visible only on <768px */
.mobile-nav-only { display: block; }
@media (min-width: 768px) {
  .mobile-nav-only { display: none; }
}

/* Mobile content padding clears the fixed bottom nav */
@media (max-width: 767px) {
  main { padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AppShell.jsx frontend/src/index.css
git commit -m "refactor: replace RoleTabs with BottomNav+TopNav in AppShell"
```

---

### Task 5: Restructure routes in `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add RefereeEntryPage to lazy imports**

Add alongside the other lazy imports:
```jsx
const RefereeEntryPage = lazy(() => import('./pages/RefereeEntryPage'));
```

- [ ] **Step 2: Add `Navigate` to react-router-dom import**

Find:
```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
```
If `Navigate` is not already there, add it.

- [ ] **Step 3: Replace the Routes block**

Replace the entire `<Routes>…</Routes>` block with:

```jsx
<Routes>
  {/* ── Shell routes: TopBar + role nav ── */}
  <Route element={<AppShell />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/tournament/:id" element={<TournamentPage />} />
    <Route path="/tournament/:id/register" element={<PlayerRegistrationPage />} />
    <Route path="/gastronomy" element={<GastronomyPage />} />
    <Route
      path="/admin"
      element={<ProtectedRoute element={<AdminPage />} roles={['admin', 'director']} />}
    />
    {/* /admin/users → redirect to /admin?tab=users */}
    <Route
      path="/admin/users"
      element={
        <ProtectedRoute
          element={<Navigate to="/admin?tab=users" replace />}
          roles={['admin', 'director']}
        />
      }
    />
    {/* /referee: TopBar only, no nav (AppShell suppresses via useMatch) */}
    <Route path="/referee" element={<RefereeEntryPage />} />
  </Route>

  {/* ── Standalone routes: no shell ── */}
  <Route path="/referee/:boardId" element={<RefereePage />} />
  <Route path="/board/:boardId" element={<CurrentGameView />} />
  <Route path="/nfc" element={<NFCScanPage />} />
  <Route path="/nfc-scan" element={<NFCScanPage />} />
  <Route path="/orders/:uid" element={<OrderPage />} />
  <Route path="/cancel/:token" element={<CancelRegistrationPage />} />
</Routes>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "refactor: restructure routes — admin into AppShell, referee standalone, /referee added"
```

---

### Task 6: Delete `RoleTabs.jsx`

**Files:**
- Delete: `frontend/src/components/RoleTabs.jsx`

- [ ] **Step 1: Verify nothing still imports RoleTabs**

```bash
grep -r "RoleTabs" frontend/src/
```
Expected: **no matches** (AppShell was already updated in Task 4).

- [ ] **Step 2: Delete the file**

```bash
git rm frontend/src/components/RoleTabs.jsx
git commit -m "chore: remove RoleTabs — replaced by BottomNav + TopNav"
```

---

## Chunk 3: Referee Board Cleanup

### Task 7: Clean up `RefereePage.jsx` — remove login gate

**Files:**
- Modify: `frontend/src/pages/RefereePage.jsx`

Remove the local token state and inline login gate. Replace `onLogout` with `useStore().logout()`.

- [ ] **Step 1: Add Zustand import**

Find the import block at the top of `RefereePage.jsx`. Add:
```jsx
import { useStore } from '../store';
```

- [ ] **Step 2: Add `logout` from store to the component**

Inside `export default function RefereePage()`, near the top, add:
```jsx
const { logout } = useStore();
```

- [ ] **Step 3: Remove the local token state line**

Find and delete this exact line:
```jsx
const [token, setToken] = useState(localStorage.getItem('token'));
```

- [ ] **Step 4: Remove the login gate early return**

Find and delete this exact line:
```jsx
if (!token) return <RefereeLogin onLogin={setToken} />;
```

- [ ] **Step 5: Replace the local `onLogout` function**

Find the local function definition (it currently does `localStorage.removeItem` + `setToken(null)`):
```jsx
const onLogout = () => { localStorage.removeItem('token'); setToken(null); };
```
Replace with:
```jsx
const onLogout = logout;
```
Note: `useStore`'s `logout` action already calls `localStorage.removeItem('token')` — confirmed in Step 1 of Task 3. No extra cleanup needed.

- [ ] **Step 6: Verify dev server starts without errors**

```bash
cd frontend && npm run dev
```
Navigate to `/referee/1` — should show the board screen directly (no login gate, no crash).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/RefereePage.jsx
git commit -m "refactor: remove login gate from RefereePage — auth handled by RefereeEntryPage"
```

---

## Chunk 4: GastronomyPage Fixes

### Task 8: Fix `GastronomyPage.jsx`

**Files:**
- Modify: `frontend/src/pages/GastronomyPage.jsx`

Three changes: (1) remove double header, (2) fix auth to use Zustand `setToken`, (3) drive `view` state reactively from `?tab` URL param.

- [ ] **Step 1: Add imports**

Add to existing imports at the top:
```jsx
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
```

- [ ] **Step 2: Replace local token state + add URL-driven view**

Find these two lines near the top of `export default function GastronomyPage()`:
```jsx
const [token, setToken] = useState(localStorage.getItem('token'));
const [view, setView] = useState('order');
```

Replace with:
```jsx
const [token, setToken] = useState(localStorage.getItem('token'));
const { setToken: storeSetToken } = useStore();
const [searchParams] = useSearchParams();
const tabParam = searchParams.get('tab');
// view state: initialized from URL, and kept in sync reactively via useEffect below
const [view, setView] = useState(
  tabParam === 'kasse' ? 'register' : tabParam === 'products' ? 'products' : 'order'
);
```

- [ ] **Step 3: Add `useEffect` to keep view in sync with URL**

Add this `useEffect` immediately after the `view` useState:
```jsx
// Keep view in sync when user navigates between tabs (URL changes without unmount)
useEffect(() => {
  setView(tabParam === 'kasse' ? 'register' : tabParam === 'products' ? 'products' : 'order');
}, [tabParam]);
```

- [ ] **Step 4: Add Zustand login handler**

Find where `GastronomyLogin` is called with `onLogin`. Create a wrapper above the return statement:
```jsx
const handleLogin = (newToken) => {
  setToken(newToken);         // local state: drives the login gate in this component
  storeSetToken(newToken);    // Zustand: updates role → AppShell nav re-renders with correct tabs
};
```
Then update the JSX:
```jsx
// was:  <GastronomyLogin onLogin={setToken} />
// now:
<GastronomyLogin onLogin={handleLogin} />
```

- [ ] **Step 5: Remove the internal header block**

Find and delete this entire block (it starts with the comment `{/* NEU: Header */}`):
```jsx
{/* NEU: Header */}
<div className="flex items-center justify-between mb-4 max-w-5xl mx-auto">
  <div className="flex items-center gap-3">
    <BackButton to="/" />
    <img src="/logo.jpeg" alt="DartEvent" className="h-10" />
  </div>
  <h1
    className="text-xl font-bold"
    style={{ background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
  >
    Gastronomie
  </h1>
</div>
```

- [ ] **Step 6: Verify**

Start dev server. Log in as gastronomy user.
- Confirm: only AppShell TopBar visible — no second header with logo
- Confirm: Gastro role pill appears in TopBar
- Mobile: BottomNav shows Bestellung / Kasse / Produkte / NFC
- Click Kasse tab → URL changes to `/gastronomy?tab=kasse`, Kasse view renders
- Click Bestellung tab → URL back to `/gastronomy`, order view renders

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/GastronomyPage.jsx
git commit -m "refactor: GastronomyPage — remove double header, Zustand auth, URL-driven tabs"
```

---

## Chunk 5: AdminPage Migration

### Task 9: Migrate `AdminPage.jsx` to AppShell

**Files:**
- Modify: `frontend/src/pages/AdminPage.jsx`

Remove: gradient header, desktop sidebar, mobile tile-grid, `showMobileTiles` state, `selectTab` function.
Replace internal `activeTab` state with `useSearchParams`, keeping the role-based tab visibility guard.

- [ ] **Step 1: Add `useSearchParams` import**

In `AdminPage.jsx`, find the react-router-dom import line and add `useSearchParams`:
```jsx
import { Link, useSearchParams } from 'react-router-dom';
```

- [ ] **Step 2: Replace `activeTab` state with URL params (keep role guard)**

Find in the `AdminDashboard` function the existing tab initialization — it uses `visibleTabs` to guard the resolved default. Replace the `useState` initialization while keeping the same guard:

Find:
```jsx
const [activeTab, setActiveTab] = useState(resolvedDefault);
```
(or similar pattern using `initialTab` / `tab` prop)

Replace with:
```jsx
const [searchParams, setSearchParams] = useSearchParams();
// Keep role-based guard: if URL names a tab not visible for this role, fall back to 'overview'
const activeTab = visibleTabs.find(t => t.id === (searchParams.get('tab') || 'overview'))
  ? (searchParams.get('tab') || 'overview')
  : 'overview';
const setActiveTab = (tab) => setSearchParams({ tab }, { replace: true });
```

- [ ] **Step 3: Remove `tab` prop from both component signatures**

Find and update:
```jsx
// was: export default function AdminPage({ tab }) {
export default function AdminPage() {
```
And:
```jsx
// was: function AdminDashboard({ tab }) {
function AdminDashboard() {
```
Also remove any usage of the `tab` parameter inside these functions (it was used as initial state — now handled by URL).

- [ ] **Step 4: Remove the gradient header block**

Find this line (exact search anchor — line begins the header div):
```jsx
<div style={{ background: 'var(--pe-gradient)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
```
Delete from this line down to (and including) its closing `</div>`. The block contains: logo image, username, role badge, logout button.

- [ ] **Step 5: Remove the desktop sidebar**

Find the sidebar container. It has a style containing `position: 'fixed'` or `width: '240px'` and renders a vertical list of tab buttons. Delete the entire sidebar div.

- [ ] **Step 6: Remove the mobile tile-grid**

Find and delete:
- `const [showMobileTiles, setShowMobileTiles] = useState(...)` — state declaration
- `const selectTab = (id) => { ... setShowMobileTiles(false); ... }` — the selectTab helper function
- The conditional JSX block rendering the tile grid when `showMobileTiles` is true

After deletion, the component's render path should go straight to the active tab content.

- [ ] **Step 7: Ensure tab content fills the page**

After sidebar removal, wrap the remaining active tab content with a container div if it's not already padded:
```jsx
<div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
  {/* rendered active tab component */}
</div>
```

- [ ] **Step 8: Verify all tabs still reachable**

Start dev server. Log in as admin. Confirm:
- Desktop: TopNav shows all 11 admin tabs; clicking each sets `?tab=...` in URL and renders correct content
- Mobile: BottomNav shows 4 admin tabs; direct URL `/admin?tab=players` renders Spieler tab
- Director login: TopNav shows only 5 director tabs (Übersicht/Turniere/Spieler/Boards/System-Log)
- `/admin/users` URL redirects to `/admin?tab=users`
- No sidebar visible anywhere

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/AdminPage.jsx
git commit -m "refactor: AdminPage — remove sidebar/header, AppShell nav via URL search params"
```

---

## Chunk 6: Final Verification + Push

### Task 10: End-to-end verification

- [ ] **Step 1: Start dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify public (no login)**

Navigate to `/`. Confirm:
- AppShell TopBar: logo only, no avatar, no role pill
- Mobile (`< 768px`): BottomNav with 🏠 Home + 🎯 Turnier — no RoleTabs visible
- Desktop (`≥ 768px`): TopNav with Home + Turnier — no RoleTabs visible

- [ ] **Step 3: Verify referee flow**

Navigate to `/referee`. Confirm:
- TopBar visible (logo + no tab nav row below it)
- Login form rendered, no nav below TopBar
- Log in as referee → board picker renders (list of boards with status + referee assignment)
- Select a free board → navigates to `/referee/:boardId`
- On `/referee/:boardId`: NO TopBar, NO BottomNav — full screen

- [ ] **Step 4: Verify gastronomy**

Log in as gastronomy user. Confirm:
- Single header (AppShell TopBar only — no internal logo/header)
- Gastro role pill in TopBar
- Mobile: 4-tab BottomNav (Bestellung / Kasse / Produkte / NFC)
- Click Kasse → `/gastronomy?tab=kasse`, Kasse view active
- Click Bestellung → `/gastronomy`, order view active
- Navigating back and forth updates view correctly (URL-driven)

- [ ] **Step 5: Verify admin**

Log in as admin. Navigate to `/admin`. Confirm:
- AppShell TopBar with Admin pill
- Desktop: 11-tab TopNav (Übersicht through Hilfe)
- Mobile: 4-tab BottomNav (Übersicht / Turniere / Boards / Admin)
- Each tab click changes URL `?tab=` and renders correct content
- `/admin/users` → redirects to `/admin?tab=users`
- No sidebar on desktop, no tile-grid on mobile

- [ ] **Step 6: Verify sub-pages**

Navigate to a tournament detail (`/tournament/:id`). Confirm:
- TopBar shows `←` back button + "Turnier-Detail" title
- BottomNav and TopNav are both hidden (sub-page mode)

- [ ] **Step 7: Final push**

```bash
git add frontend/src/components/BottomNav.jsx \
        frontend/src/components/TopNav.jsx \
        frontend/src/pages/RefereeEntryPage.jsx \
        frontend/src/components/AppShell.jsx \
        frontend/src/index.css \
        frontend/src/App.jsx \
        frontend/src/pages/RefereePage.jsx \
        frontend/src/pages/GastronomyPage.jsx \
        frontend/src/pages/AdminPage.jsx
git status   # confirm only the files above are staged
git push origin dev
```
