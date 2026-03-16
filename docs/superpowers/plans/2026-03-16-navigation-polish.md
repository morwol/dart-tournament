# Navigation Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the unified navigation by adding an emergency logout to the referee scoring view, a "Zur Startseite" escape hatch in the referee board picker, and fixing the double-header on GastronomyPage login.

**Architecture:** The AppShell + TopNav + BottomNav infrastructure, AdminPage useSearchParams tab routing, and App.jsx route structure are **already implemented**. This plan only adds three surgical changes to `RefereePage.jsx`, `RefereeEntryPage.jsx`, and `GastronomyPage.jsx`. No routing or store changes are needed.

**Tech Stack:** React 18, Zustand (`useStore`), react-router-dom v6, inline styles, PE CSS tokens (dark mode only), Verdana font.

**Design constraints (MANDATORY — never deviate):**
- Font: `Verdana, Geneva, sans-serif` — no exceptions
- All colors via PE CSS tokens: `--pe-bg`, `--pe-bg-card`, `--pe-bg-elevated`, `--pe-border`, `--pe-text`, `--pe-text-sub`, `--pe-text-muted`, `--pe-cyan-bright`, `--pe-danger`, etc.
- Touch targets: minimum 44px on all interactive elements
- Dark mode always (`--pe-bg: #090E1A`) — no white backgrounds

---

## Chunk 1: Emergency Logout Button in RefereePage

### Task 1: EmergencyLogout component in RefereePage

**Files:**
- Modify: `frontend/src/pages/RefereePage.jsx`

**Context:**
`RefereePage` is a fully standalone page (no AppShell, no TopBar). It renders either `<TabletLayout>` or `<PhoneLayout>` depending on screen orientation. Both layouts are defined in the same file. The referee logs in via `/referee` (RefereeEntryPage) and then navigates to `/referee/:boardId` (RefereePage). Since the PWA has no address bar, there must be an in-app logout option.

The `useStore` hook is already imported at line 5: `import { useStore } from '../store';`
`useStore` exposes `{ logout }` — calling `logout()` clears the token and role.

The `btn` helper at line 34 produces base button styles:
```js
const btn = (extra = {}) => ({
  fontFamily: 'Verdana, Geneva, sans-serif',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  border: '1px solid var(--pe-border)',
  ...extra,
});
```

- [ ] **Step 1: Add `EmergencyLogout` component** — insert this component definition **after** the `useTabletLandscape` hook (around line 31, before the `btn` helper):

```jsx
// Emergency logout — fixed ⚙ button, visible in full-screen scoring view (no AppShell)
function EmergencyLogout() {
  const { logout } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/referee');
  };

  return (
    <div ref={ref} style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 200 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menü öffnen"
        style={{
          width: '44px', height: '44px',
          borderRadius: '50%',
          background: 'var(--pe-bg-elevated)',
          border: '1px solid var(--pe-border)',
          color: 'var(--pe-text-muted)',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}
      >
        ⚙
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--pe-bg-elevated)',
          border: '1px solid var(--pe-border)',
          borderRadius: '12px',
          padding: '8px',
          minWidth: '140px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', minHeight: '44px',
              padding: '10px 12px',
              background: 'none',
              border: '1px solid var(--pe-border)',
              borderRadius: '8px',
              color: 'var(--pe-danger)',
              cursor: 'pointer',
              fontSize: '13px', fontWeight: 'bold',
              fontFamily: 'Verdana, Geneva, sans-serif',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,96,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `useNavigate` and `useRef` to imports** — line 2 currently reads:
```js
import { useParams, Navigate } from 'react-router-dom';
```
Change to:
```js
import { useParams, Navigate, useNavigate } from 'react-router-dom';
```
Line 1 currently reads:
```js
import { useEffect, useState, useCallback } from 'react';
```
Change to:
```js
import { useEffect, useState, useCallback, useRef } from 'react';
```

- [ ] **Step 3: Add `<EmergencyLogout />` to `TabletLayout`** — `TabletLayout` starts at line 517. Find its return statement — it returns an outermost `<div style={{ display: 'flex', height: '100vh', ... }}>`. Insert `<EmergencyLogout />` as the **first child of that div** without changing any existing props or children:

```jsx
// BEFORE (do not change the div's style props):
return (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Verdana, Geneva, sans-serif', background: 'var(--pe-bg)' }}>
    {/* existing content */}

// AFTER — only add <EmergencyLogout /> as first child:
return (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Verdana, Geneva, sans-serif', background: 'var(--pe-bg)' }}>
    <EmergencyLogout />
    {/* existing content unchanged */}
```

- [ ] **Step 4: Add `<EmergencyLogout />` to `PhoneLayout`** — `PhoneLayout` starts at line 698. Find its return statement — it returns `<div style={{ minHeight: '100vh', ... }}>`. Insert `<EmergencyLogout />` as the **first child without changing existing props**:

```jsx
// AFTER — only add <EmergencyLogout /> as first child:
return (
  <div style={{ minHeight: '100vh', padding: '12px', maxWidth: '480px', margin: '0 auto', fontFamily: 'Verdana, Geneva, sans-serif', boxSizing: 'border-box' }}>
    <EmergencyLogout />
    {/* existing content unchanged */}
```

- [ ] **Step 5: Verify in browser** — open `/referee/:boardId` in PWA mode. Confirm:
  - Small ⚙ button visible top-right, does not obscure game controls
  - Clicking opens dropdown with "Abmelden" button
  - Clicking "Abmelden" clears token and navigates to `/referee`
  - Clicking outside closes dropdown without logging out

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/RefereePage.jsx
git commit -m "feat: add emergency logout button to referee scoring view

Fixed ⚙ button top-right (44px, zIndex 200) with logout dropdown.
Required for PWA where no address bar is available.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: "Zur Startseite" Link in RefereeEntryPage

### Task 2: Add home link to BoardPicker

**Files:**
- Modify: `frontend/src/pages/RefereeEntryPage.jsx`

**Context:**
`RefereeEntryPage` at `/referee` is a standalone page (outside AppShell). It has two states: login form (when not logged in) and board picker (when logged in). The `BoardPicker` component (line 113) renders the board list. Since this is a PWA without an address bar, the referee needs an in-app link to return to `/` if they need to reach admin or have other issues.

The `useNavigate` hook from react-router-dom is already imported (line 4). `Link` is not imported yet — add it.

- [ ] **Step 1: Add `Link` to react-router-dom import** — line 4 currently reads:
```js
import { useNavigate } from 'react-router-dom';
```
Change to:
```js
import { useNavigate, Link } from 'react-router-dom';
```

- [ ] **Step 2: Add "Zur Startseite" link** — inside `BoardPicker`'s return, **after** the last board card / "Keine Boards" message but **before** the closing `</div>`, add:

```jsx
{/* PWA escape hatch — no address bar in installed app */}
<div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--pe-border)' }}>
  <Link
    to="/"
    style={{
      color: 'var(--pe-text-muted)',
      fontSize: '13px',
      textDecoration: 'none',
      fontFamily: 'Verdana, Geneva, sans-serif',
    }}
    onMouseEnter={e => e.currentTarget.style.color = 'var(--pe-text-sub)'}
    onMouseLeave={e => e.currentTarget.style.color = 'var(--pe-text-muted)'}
  >
    ← Zur Startseite
  </Link>
</div>
```

Place this **after** the empty-state paragraph and **inside** the outer `<div style={{ maxWidth: '480px', ... }}>`.

- [ ] **Step 3: Verify in browser** — open `/referee` while logged in. Confirm:
  - Board list renders normally
  - "← Zur Startseite" appears below the board list, subtle muted color
  - Clicking it navigates to `/`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/RefereeEntryPage.jsx
git commit -m "feat: add 'Zur Startseite' escape link to referee board picker

PWA has no address bar — referee needs an in-app way to reach home
if they need to access other parts of the app.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: GastronomyPage Login Overlay Fix

### Task 3: Make GastronomyLogin cover full viewport

**Files:**
- Modify: `frontend/src/pages/GastronomyPage.jsx`

**Context:**
`GastronomyPage` is rendered inside `AppShell` (which renders `TopBar` at the top). When the user is not logged in (`!token`), `GastronomyPage` currently returns `<GastronomyLogin ... />` directly into the AppShell content area. This means the TopBar is visible above the login form — the user sees two logos (one in TopBar, one inside GastronomyLogin).

The fix: wrap the `GastronomyLogin` in a `position: fixed; inset: 0; z-index: 500` overlay, exactly like `AdminPage` does:

```jsx
// AdminPage pattern (already correct — copy this):
if (!token) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--pe-bg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'auto',
    }}>
      <AdminLogin />
    </div>
  );
}
```

The `GastronomyLogin` component (defined inside GastronomyPage.jsx, line 11) already renders a centered login form — no changes to the component itself are needed, only the wrapping.

Line 286 in `GastronomyPage.jsx` currently reads:
```jsx
if (!token) return <GastronomyLogin onLogin={handleLogin} />;
```

- [ ] **Step 1: Wrap GastronomyLogin in full-viewport overlay** — change line 286 from:
```jsx
if (!token) return <GastronomyLogin onLogin={handleLogin} />;
```
to:
```jsx
if (!token) return (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'var(--pe-bg)',
    display: 'flex', flexDirection: 'column',
    overflow: 'auto',
  }}>
    <GastronomyLogin onLogin={handleLogin} />
  </div>
);
```

- [ ] **Step 2: Verify in browser** — navigate to `/gastronomy` while not logged in. Confirm:
  - Login form covers entire screen (TopBar no longer visible behind it)
  - Only one logo visible (inside the login form)
  - After login, overlay disappears and gastronomy UI appears normally with TopBar + nav tabs

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/GastronomyPage.jsx
git commit -m "fix: wrap GastronomyLogin in full-viewport overlay

GastronomyLogin was rendering inside AppShell content area, causing
TopBar to remain visible above the login form (double logo).
Now matches AdminPage pattern: position:fixed overlay covers viewport.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
