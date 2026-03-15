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

**`frontend/src/App.jsx`** — Add `<Toaster />` outside `<Suspense>` so it is always mounted even during lazy route loading. Place it as a direct sibling of `<Suspense>`, wrapped in a React Fragment.

**6 callsite files** — Replace every `alert(msg)` with `addToast({ type: 'error', message: msg })` (or `'success'` where appropriate). See Callsites section.

---

## Data Shape

```js
// A single toast object stored in the Zustand slice
{
  id:      number,   // auto-incrementing counter — collision-safe
  type:    'error' | 'success' | 'warning',
  message: string,
}
```

---

## Store Interface (`store/toasts.js`)

```js
import { create } from 'zustand';

let _nextId = 1;

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ type, message }) => {
    const id = _nextId++;
    // Keep at most 2 existing toasts + 1 new = max 3 visible
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, type, message }] }));
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

**Note:** The store does NOT auto-remove toasts on a timer. Auto-dismiss is handled by `Toaster.jsx` (see below), which owns the full lifecycle including exit animation. This prevents a race condition between the store timeout and the animation.

---

## Toaster Component (`components/Toaster.jsx`)

**Position:** `position: fixed`, `bottom: 16px`, `left: 50%`, `transform: translateX(-50%)`, `zIndex: 9999`.

**Width:** `width: min(400px, calc(100vw - 32px))` — full-width on small screens, capped at 400px on larger.

**Stack direction:** newest on top (array rendered in reverse). Gap: 8px between toasts.

### Animation lifecycle — owned by Toaster

Each rendered toast manages its own dismiss lifecycle locally:

1. On mount: toast enters with CSS class `toast-enter` (slide up + fade in, 200ms)
2. After auto-dismiss timeout (4 000ms for error, 3 000ms for success/warning): apply CSS class `toast-exit` (fade out, 150ms)
3. After 150ms: call `removeToast(id)` to remove from store

Manual dismiss (clicking `✕`): immediately apply `toast-exit`, wait 150ms, then call `removeToast(id)`.

This means `Toaster.jsx` must use `useState` to track which toasts are in the exit phase locally, so they remain rendered during the 150ms fade-out even though they may still be in the store array.

### CSS classes (in `index.css`)

```css
.toast-enter {
  animation: toastIn 200ms ease-out forwards;
}
.toast-exit {
  animation: toastOut 150ms ease-in forwards;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toastOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
```

### Single toast anatomy

```
┌──────────────────────────────────────────┐
│▌  [icon]  Message text                ✕  │
└──────────────────────────────────────────┘
 ^                                       ^
 4px solid left accent bar           dismiss button (min 64×64px tap target per CLAUDE.md)
```

**Background / border per type (rgba hex values are a necessary CSS limitation — CSS variables cannot be used directly inside `rgba()`):**

| Type    | Background                   | Border                          | Accent / icon color    |
|---------|------------------------------|---------------------------------|------------------------|
| error   | `rgba(255,69,96,0.12)`       | `1px solid rgba(255,69,96,0.3)` | `var(--pe-danger)`     |
| success | `rgba(0,229,160,0.12)`       | `1px solid rgba(0,229,160,0.3)` | `var(--pe-success)`    |
| warning | `rgba(255,176,32,0.12)`      | `1px solid rgba(255,176,32,0.3)`| `var(--pe-warning)`    |

The rgba values are the numeric equivalents of `--pe-danger` (#FF4560), `--pe-success` (#00E5A0), `--pe-warning` (#FFB020) at reduced opacity. This is the only accepted exception to the PE token rule.

**Typography:** Verdana, Geneva, sans-serif; 13px; `color: var(--pe-text)`.

**Dismiss button:** minimum 64×64px tap target (per CLAUDE.md — project-wide requirement). Use `padding` to achieve the tap area without enlarging the visual `✕` icon.

**Icons (inline SVG, no external dep):**
- error: `✕` circle
- success: `✓` check
- warning: `!` triangle

---

## App.jsx Integration

```jsx
import Toaster from './components/Toaster';

// Inside App() return — Toaster OUTSIDE Suspense so it survives lazy-load fallback:
return (
  <>
    <Toaster />
    <Suspense fallback={<LazyFallback />}>
      <ThemeLoader />
      <Routes>
        ...
      </Routes>
    </Suspense>
  </>
);
```

**Why outside Suspense:** If `<Toaster />` is inside `<Suspense>`, it gets replaced by the `LazyFallback` while a lazy route is loading. Toasts triggered during navigation (e.g. auth errors) would be lost. Placing it outside ensures it is always mounted.

---

## Callsites

### `frontend/src/pages/GastronomyPage.jsx` — 5 calls, all `error`

| Line | Fallback message |
|------|-----------------|
| 144  | `'Gast nicht gefunden'` |
| 191  | `'Bestellung fehlgeschlagen – bitte erneut versuchen'` |
| 225  | `'Abrechnung fehlgeschlagen – bitte erneut versuchen'` |
| 244  | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 355  | `'Gast konnte nicht angelegt werden'` |

### `frontend/src/pages/RefereePage.jsx` — 5 calls, all `error`

| Line | Fallback message |
|------|-----------------|
| 104  | `'Fehler'` |
| 421  | `'Fehler beim Überspringen'` |
| 573  | `'Fehler'` |
| 946  | `'Fehler'` |
| 956  | `'Fehler'` |

### `frontend/src/pages/AdminPage.jsx` — 19 calls

| Line | Type    | Fallback message |
|------|---------|-----------------|
| 137  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 204  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 215  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 307  | error   | `'Spieler konnte nicht angelegt werden'` |
| 335  | error   | `'Spieler konnte nicht gespeichert werden'` |
| 466  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 502  | error   | `'Aktion fehlgeschlagen'` |
| 517  | error   | `'Speichern fehlgeschlagen'` |
| 523  | error   | `'Aktion fehlgeschlagen'` |
| 652  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 659  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 667  | error   | `'Löschen fehlgeschlagen'` |
| 818  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 827  | success | `'Test-Mail gesendet!'` *(no err.message — literal success)* |
| 830  | error   | `'Fehler beim Senden'` |
| 841  | success | `'Event-Zusammenfassung gesendet!'` *(no err.message — literal success)* |
| 843  | error   | `'Aktion fehlgeschlagen – bitte erneut versuchen'` |
| 2058 | error   | `'Speichern fehlgeschlagen'` |
| 2072 | error   | `'Reset fehlgeschlagen'` |

### `frontend/src/components/admin/TournamentManager.jsx` — 2 calls, all `error`

| Line | Fallback message |
|------|-----------------|
| 26   | `'Fehler'` |
| 37   | `'Fehler beim Starten'` |

### `frontend/src/components/game/BulloffScreen.jsx` — 1 call, `error`

| Line | Fallback message |
|------|-----------------|
| 13   | `'Fehler beim Ausbullen'` |

### `frontend/src/components/game/ThrowInput.jsx` — 1 call, `error`

| Line | Fallback message |
|------|-----------------|
| 41   | `'Fehler beim Eintragen'` |

---

## PE Corporate Design Compliance

- Font: Verdana, Geneva, sans-serif — no exceptions
- Colors: PE tokens used for accent/text; rgba overlays for backgrounds are a necessary CSS limitation (documented above)
- Dark mode: semi-transparent overlays on dark base — visually consistent with PE dark theme
- Touch targets: dismiss `✕` button minimum **64×64px** (CLAUDE.md mandatory requirement)
- No external library dependency
