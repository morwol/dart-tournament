# Design Spec: Frontend UI/UX Overhaul (Issue #30)

**Date:** 2026-03-15
**Status:** Approved
**Branch target:** `dev`

---

## Overview

Comprehensive UI/UX overhaul of the DartEvent Manager PWA. Introduces a consistent navigation shell, role-based tab navigation, a unified back button pattern, and polished hover/transition animations throughout. All changes must adhere to P Entertainment Corporate Design (Verdana, dark mode, PE CSS tokens).

---

## 1. Route Architecture — In vs. Out of AppShell

Not all routes go inside AppShell. The following classification is required before implementation.

### Routes INSIDE AppShell (persistent TopBar + RoleTabs)

| Route | Type | TopBar state |
|-------|------|-------------|
| `/` | Root | Logo + Role Pill + Tabs |
| `/tournament/:id` | Sub-page | ← + "Turnier-Detail" |
| `/tournament/:id/register` | Sub-page | ← + "Anmelden" |
| `/referee/:boardId` | Root (own role) | Logo + Referee Pill + Tabs |
| `/gastronomy` | Root (own role) | Logo + Gastro Pill + Tabs |

### Routes OUTSIDE AppShell (standalone, no persistent header)

| Route | Reason |
|-------|--------|
| `/admin`, `/admin/users` | AdminPage has its own full-screen header + tab navigation. Wrapping with AppShell would collide visually. Admin remains self-contained. |
| `/board/:boardId` | `CurrentGameView` is a TV/beamer display page — no nav shell appropriate. Public, full-screen, standalone. |
| `/nfc`, `/nfc-scan` | Public QR/NFC entry point — standalone, no auth context. |
| `/orders/:uid` | Public QR-code order page — standalone, no auth context. |
| `/cancel/:token` | Tokenised public cancellation page — standalone. |

### react-router-dom v6 Nested Route Structure

AppShell is implemented as a **layout route** using `<Outlet />`. App.jsx restructuring:

```jsx
<Routes>
  {/* Shell routes — TopBar + RoleTabs */}
  <Route element={<AppShell />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/tournament/:id" element={<TournamentPage />} />
    <Route path="/tournament/:id/register" element={<PlayerRegistrationPage />} />
    <Route path="/referee/:boardId" element={<RefereePage />} />
    <Route path="/gastronomy" element={<GastronomyPage />} />
  </Route>

  {/* Standalone routes — no shell */}
  <Route path="/admin" element={<AdminPage />} />
  <Route path="/admin/users" element={<AdminPage tab="users" />} />  {/* retain tab prop */}
  <Route path="/board/:boardId" element={<CurrentGameView />} />
  <Route path="/nfc" element={<NFCScanPage />} />
  <Route path="/nfc-scan" element={<NFCScanPage />} />
  <Route path="/orders/:uid" element={<OrderPage />} />
  <Route path="/cancel/:token" element={<CancelRegistrationPage />} />
</Routes>
```

---

## 2. Navigation Architecture

### AppShell Component

Wraps shell routes as a react-router-dom v6 layout route. Reads `role` from Zustand. Determines TopBar state (root vs sub-page) based on current route depth.

```
<AppShell>            ← layout route, renders <Outlet />
  <TopBar />          ← always visible within shell
  <RoleTabs />        ← only on root-level shell routes
  <Outlet />          ← page content
</AppShell>
```

Root-level shell routes (no parent path segment): `/`, `/referee/:boardId`, `/gastronomy`
Sub-page shell routes (have a parent): `/tournament/:id`, `/tournament/:id/register`

### Top Bar — Two States

**Root-level state** (HomePage, RefereePage, GastronomyPage):
```
[DartEvent Logo]  ············  [Role Pill]  [Avatar →Logout]
[Tab 1]  [Tab 2]  [Tab 3]  ...
```

**Sub-page state** (TournamentPage, PlayerRegistrationPage):
```
[← Icon (64×64px tap area)]  ·  [Page Title]  ·  [Avatar]
(no Tab Row)
```

- ← Icon: **64×64px minimum tappable area** achieved via padding (`padding: 12px`around a 40px visual icon). Color `var(--pe-text-sub)`, hover `var(--pe-cyan-bright)`, transition 150ms.
- Page Title: centered, bold 14px, `var(--pe-text)`.
- Logo hidden on sub-pages.

### Role Pill Colors

| Role | Background | Text | Border |
|------|-----------|------|--------|
| public | — | — | not shown |
| referee | `rgba(255,176,32,0.15)` | `--pe-warning` | `rgba(255,176,32,0.3)` |
| gastronomy | `rgba(0,229,160,0.15)` | `--pe-success` | `rgba(0,229,160,0.3)` |
| admin / director | `rgba(0,184,255,0.15)` | `--pe-cyan-bright` | `rgba(0,184,255,0.3)` |

---

## 3. Role-Based Tab Navigation

### RoleTabs Component

Renders a horizontal scrollable tab row. Tabs derived from `role` in Zustand. Hidden on sub-pages. Scrollable on mobile (`overflow-x: auto`, scrollbar hidden).

### Tab Sets per Role

| Role | Tabs (in order) | Default Tab |
|------|----------------|-------------|
| public (unauthenticated) | Home · Turnier | Home |
| referee | Boards · Turnier | Boards |
| gastronomy | Bestellungen · Produkte · NFC | Bestellungen |
| admin | Home · Turnier · Boards · Gastro · Admin | Home |
| director | Home · Turnier · Boards · Spieler | Home |

Note: "Boards" tab for referee/admin links to `/referee/:boardId` (referee's board) or `/` board overview. A dedicated `BoardsPage` is not in scope — the tab for referee routes to their assigned board, for admin to the boards overview within AdminPage.

### Active Tab Indicator

Sliding underline: CSS transition on `left` + `width`, 200ms ease. Active tab `var(--pe-cyan-bright)`.

### Role Detection & Zustand Store

```js
// store/index.js additions
{
  token: localStorage.getItem('token') ?? null,
  role:  parseJwt(localStorage.getItem('token'))?.role ?? null,  // init from localStorage

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, role: parseJwt(token)?.role ?? null });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, role: null });
  }
}
```

Role is initialised from localStorage on page load so hard-refresh preserves the authenticated state.

### Auth Handling for Shell Routes

- `RefereePage` and `GastronomyPage` handle their own inline login — no ProtectedRoute applied. If user is unauthenticated, the page renders its login form as today.
- `ProtectedRoute` is **not activated** as part of this spec. Auth hardening is a separate security task.

---

## 4. Back Button Pattern

### Behavior

Back navigation handled exclusively by `TopBar` on shell sub-pages. No page implements its own back button.

- ← Icon calls `useNavigate(-1)` by default.
- Explicit `onBack` prop available for pages that need custom back behavior.
- `BackButton.jsx` deprecated — all usages in `PlayerRegistrationPage`, `TournamentPage`, `NFCScanPage`, `GastronomyPage`, `OrderPage` removed (TopBar handles it via AppShell).
- `CancelRegistrationPage`, `OrderPage`, `NFCScanPage` are standalone (outside AppShell) and retain their own simple back navigation temporarily — deduplicated in a follow-up.

### Pages in AppShell Requiring Title

| Page | Title |
|------|-------|
| TournamentPage | Turnier-Detail |
| PlayerRegistrationPage | Anmelden |

RefereePage and GastronomyPage are root-level shell routes — they show Logo + Tabs, not ← back.

### Touch Targets

← Icon tappable area: **min 64×64px** via `padding: 12px` around the SVG/icon. All other interactive elements in section 6 audit.

---

## 5. Animations & Hover Effects

### Global Utilities (index.css)

```css
/* Hover: interactive cards */
.pe-card-interactive {
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
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
  transition: border-color 150ms ease, color 150ms ease, background 150ms ease, transform 150ms ease;
}
.pe-btn:hover {
  border-color: var(--pe-cyan-bright);
  color: var(--pe-cyan-bright);
}
.pe-btn:active {
  transform: scale(0.97);
}

/* Page entry fade */
.pe-page-enter {
  animation: pe-fade-in 200ms ease forwards;
}
@keyframes pe-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Applied To

| Element | Effect |
|---------|--------|
| Tournament cards | `pe-card-interactive` |
| Player cards | `pe-card-interactive` |
| Board cards | `pe-card-interactive` |
| All `<button>` elements | `pe-btn` |
| FAB buttons (HomePage) | `pe-btn` + glow on hover |
| Nav tabs | color + underline transition |
| Page root `<div>` (in AppShell) | `pe-page-enter` |
| TopBar ← icon | color transition to cyan |

---

## 6. Touch Target Audit — Required Fixes

All interactive elements must meet **min 64px height**.

| Element | File | Current | Fix |
|---------|------|---------|-----|
| TopBar ← icon | TopBar.jsx (new) | — | 64×64px via padding |
| Tab buttons | RoleTabs.jsx (new) | — | `minHeight: 64px` |
| Search input | HomePage.jsx:180 | 48px | padding increase → 64px |
| Category buttons | GastronomyPage.jsx:496 | 48px | `minHeight: 64px` |

---

## 7. Hardcoded Color Fixes

Replace with PE tokens in:

| File | Lines | Issue |
|------|-------|-------|
| HomePage.jsx | 391 | Hardcoded gradient → `var(--pe-gradient)` |
| GastronomyPage.jsx | 46, 72, 357 | `'#fff'` → `var(--pe-text)` |
| CurrentGameView.jsx | 140, 152 | Hardcoded gradient → `var(--pe-gradient)` |
| PlayerRegistrationPage.jsx | 124, 206 | `'#fff'` → `var(--pe-text)` |

---

## 8. Component Summary

### New Components

| File | Purpose |
|------|---------|
| `components/AppShell.jsx` | Layout route wrapper: TopBar + RoleTabs + Outlet |
| `components/TopBar.jsx` | Root state (logo+pill) vs sub-page state (←+title) |
| `components/RoleTabs.jsx` | Role-aware scrollable tab row |

### Modified Files

| File | Change |
|------|--------|
| `store/index.js` | Add `role`, init from localStorage, clear on logout |
| `App.jsx` | Restructure routes into nested layout (AppShell shell + standalone) |
| `index.css` | Add `pe-card-interactive`, `pe-btn`, `pe-page-enter` utilities |
| `PlayerRegistrationPage.jsx` | Remove inline ← link; remove `BackButton` usage |
| `TournamentPage.jsx` | Remove `BackButton` usage |
| `HomePage.jsx:391` | Fix hardcoded gradient |
| `GastronomyPage.jsx:46,72,357` | Fix hardcoded `#fff` |
| `CurrentGameView.jsx:140,152` | Fix hardcoded gradient |
| `PlayerRegistrationPage.jsx:124,206` | Fix hardcoded `#fff` |

### Deprecated

| File | Status |
|------|--------|
| `components/BackButton.jsx` | Deprecated — keep file, remove all usages from shell pages |

---

## 9. Out of Scope

- AdminPage redesign (self-contained, separate issue)
- GastronomyPage / RefereePage `alert()` → toast (separate issue)
- ProtectedRoute auth hardening (separate security task)
- Skeleton loading screens
- Dedicated BoardsPage component
- CancelRegistrationPage, OrderPage, NFCScanPage back nav unification

---

## 10. Acceptance Criteria

- [ ] AppShell wraps shell routes; standalone routes render without shell
- [ ] TopBar shows Logo + Role Pill + Avatar on root shell routes
- [ ] TopBar shows ← + Page Title + Avatar on sub-page shell routes
- [ ] ← touch target ≥ 64×64px
- [ ] RoleTabs renders correct tabs per JWT role
- [ ] Role persists in Zustand after hard refresh (localStorage init)
- [ ] Hover effects on all interactive cards and buttons
- [ ] Page fade-in animation on shell route transitions
- [ ] All touch targets ≥ 64px (tabs 64px, search 64px, category buttons 64px)
- [ ] No hardcoded colors — PE tokens used in all fixed files
- [ ] Verdana font unchanged throughout
- [ ] Dark mode consistent — no light-mode leaks
- [ ] BackButton.jsx usages removed from all shell pages
- [ ] react-router-dom v6 nested routes work correctly (no blank screens)
