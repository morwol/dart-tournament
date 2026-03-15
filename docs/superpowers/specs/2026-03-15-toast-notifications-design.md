# Toast Notifications Implementation Design

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Replace all `alert()` calls across the frontend with a lightweight, in-house toast notification system that matches PE Corporate Design.

**Scope:** Full sweep — all `alert()` calls in GastronomyPage, RefereePage, AdminPage, TournamentManager, BulloffScreen, ThrowInput.

---

## Architecture

### New files

**`frontend/src/store/toasts.js`** — Standalone Zustand slice (separate from `useStore` to keep auth/tournament concerns isolated).

**`frontend/src/components/Toaster.jsx`** — Fixed-position overlay component. Renders the active toast stack. Imported once in `App.jsx`.

### Modified files

**`frontend/src/App.jsx`** — Add `<Toaster />` at the root, inside `<Suspense>` but outside `<Routes>`, so it is always mounted regardless of current route.

**6 callsite files** — Replace every `alert(msg)` with `addToast({ type: 'error', message: msg })` (or `'success'` where appropriate). See Callsites section.

---

## Data Shape

```js
// A single toast object stored in the Zustand slice
{
  id:      number,   // Date.now() — unique per toast
  type:    'error' | 'success' | 'warning',
  message: string,
}
```

---

## Store Interface (`store/toasts.js`)

```js
import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ type, message }) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, type, message }] }));
    // auto-remove after timeout
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, type === 'error' ? 4000 : 3000);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

**Stack cap:** `slice(-2)` keeps the last 2 existing toasts when adding a new one, so the visible stack never exceeds 3.

**Auto-dismiss:** 4 000 ms for `error`, 3 000 ms for `success` and `warning`.

---

## Toaster Component (`components/Toaster.jsx`)

**Position:** `position: fixed`, `bottom: 16px`, `left: 50%`, `transform: translateX(-50%)`, `zIndex: 9999`.

**Width:** `width: min(400px, calc(100vw - 32px))` — full-width on small screens, capped at 400px on larger.

**Stack direction:** newest on top (array rendered in reverse). Gap: 8px between toasts.

### Single toast anatomy

```
┌──────────────────────────────────────────┐
│▌  [icon]  Message text                ✕  │
└──────────────────────────────────────────┘
 ^                                       ^
 4px solid left accent bar           dismiss button (min 44×44px tap target)
```

**Background / border per type:**

| Type    | Background                   | Border                        | Accent / icon color    |
|---------|------------------------------|-------------------------------|------------------------|
| error   | `rgba(255,69,96,0.12)`       | `1px solid rgba(255,69,96,0.3)` | `var(--pe-danger)`   |
| success | `rgba(0,229,160,0.12)`       | `1px solid rgba(0,229,160,0.3)` | `var(--pe-success)`  |
| warning | `rgba(255,176,32,0.12)`      | `1px solid rgba(255,176,32,0.3)`| `var(--pe-warning)`  |

**Typography:** Verdana, 13px, `color: var(--pe-text)`.

**Icons (inline SVG, no external dep):**
- error: `✕` circle (or simple `!` in a circle)
- success: `✓` check
- warning: `!` triangle

### Animation

CSS-only, no library:
- **Enter:** `opacity: 0; transform: translateY(12px)` → `opacity: 1; transform: translateY(0)` over 200ms `ease-out`
- **Exit:** triggered by adding a CSS class `toast-exit` before removal, `opacity: 1` → `opacity: 0` over 150ms

Use `useState` + `useEffect` in `Toaster.jsx` to manage the exit animation before calling `removeToast`.

---

## Callsites

All `alert()` calls and their replacement types:

### `frontend/src/pages/GastronomyPage.jsx`
| Line | Current | Replacement |
|------|---------|-------------|
| 144  | `alert(err.message \|\| 'Gast nicht gefunden')` | `addToast({ type: 'error', message: err.message \|\| 'Gast nicht gefunden' })` |
| 191  | `alert(err.message \|\| 'Bestellung fehlgeschlagen...')` | `addToast({ type: 'error', message: ... })` |
| 225  | `alert(err.message \|\| 'Abrechnung fehlgeschlagen...')` | `addToast({ type: 'error', message: ... })` |
| 244  | `alert(err.message \|\| 'Aktion fehlgeschlagen...')` | `addToast({ type: 'error', message: ... })` |
| 355  | `.catch(err => alert(err.message \|\| 'Gast konnte nicht angelegt werden'))` | `addToast({ type: 'error', message: ... })` |

### `frontend/src/pages/RefereePage.jsx`
| Line | Current | Replacement |
|------|---------|-------------|
| 104  | `alert(err.message \|\| 'Fehler')` | `addToast({ type: 'error', message: ... })` |
| 421  | `alert(err.message \|\| 'Fehler beim Überspringen')` | `addToast({ type: 'error', message: ... })` |
| 573  | `alert(err.message \|\| 'Fehler')` | `addToast({ type: 'error', message: ... })` |
| 946  | `alert(err.message \|\| 'Fehler')` | `addToast({ type: 'error', message: ... })` |
| 956  | `alert(err.message \|\| 'Fehler')` | `addToast({ type: 'error', message: ... })` |

### `frontend/src/pages/AdminPage.jsx`
All `alert(err.message || '...')` → `addToast({ type: 'error', message: ... })`.
Exception — two success alerts:
- Line ~827: `alert('Test-Mail gesendet!')` → `addToast({ type: 'success', message: 'Test-Mail gesendet!' })`
- Line ~841: `alert('Event-Zusammenfassung gesendet!')` → `addToast({ type: 'success', message: 'Event-Zusammenfassung gesendet!' })`

### `frontend/src/components/admin/TournamentManager.jsx`
- Lines 26, 37: `alert(err.message || 'Fehler...')` → `addToast({ type: 'error', message: ... })`

### `frontend/src/components/game/BulloffScreen.jsx`
- Line 13: `alert(err.message || 'Fehler beim Ausbullen')` → `addToast({ type: 'error', message: ... })`

### `frontend/src/components/game/ThrowInput.jsx`
- Line 41: `alert(err.message || 'Fehler beim Eintragen')` → `addToast({ type: 'error', message: ... })`

---

## App.jsx Integration

```jsx
import Toaster from './components/Toaster';

// Inside App():
<Suspense fallback={<LazyFallback />}>
  <ThemeLoader />
  <Toaster />          {/* ← add here, outside Routes */}
  <Routes>
    ...
  </Routes>
</Suspense>
```

---

## PE Corporate Design Compliance

- Font: Verdana, Geneva, sans-serif — no exceptions
- Colors: PE tokens only — no hardcoded hex values in Toaster
- Dark mode: all backgrounds use semi-transparent overlays on dark base (`--pe-bg-card` family)
- Touch targets: dismiss `✕` button minimum 44×44px
- No external library dependency
