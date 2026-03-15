# Toast Notifications Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every `alert()` call in the frontend with a PE Corporate Design-compliant in-house toast notification system.

**Architecture:** A standalone Zustand slice (`store/toasts.js`) holds the toast queue. A `Toaster.jsx` component renders it as a fixed overlay, owning the full animation lifecycle. `App.jsx` mounts `<Toaster />` outside `<Suspense>` so it survives lazy-route loading. All 33 `alert()` callsites across 6 files are replaced with `addToast({ type, message })`.

**Tech Stack:** React 18, Zustand 4, CSS animations (no external library), Vite build.

---

## Chunk 1: Infrastructure (store + CSS + component + App.jsx wiring)

### Task 1: Add toast CSS animations to `index.css`

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add toast keyframes and utility classes**

Append the following block to the end of `frontend/src/index.css`:

```css
/* ─── Toast Notifications ───────────────────────────────────── */
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

- [ ] **Step 2: Verify build**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/index.css
git commit -m "feat: add toast animation CSS classes"
```

---

### Task 2: Create the toast Zustand store

**Files:**
- Create: `frontend/src/store/toasts.js`

- [ ] **Step 1: Create the store**

Create `frontend/src/store/toasts.js` with exactly this content:

```js
// frontend/src/store/toasts.js
import { create } from 'zustand';

let _nextId = 1;

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ type, message }) => {
    const id = _nextId++;
    // Keep at most 2 existing + 1 new = max 3 visible
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, type, message }] }));
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

**Note:** The store does NOT auto-remove toasts on a timer — that lifecycle is owned by `Toaster.jsx` to avoid race conditions with the exit animation.

- [ ] **Step 2: Verify build**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/store/toasts.js
git commit -m "feat: add toast Zustand store"
```

---

### Task 3: Create the `Toaster.jsx` component

**Files:**
- Create: `frontend/src/components/Toaster.jsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/Toaster.jsx` with exactly this content:

```jsx
// frontend/src/components/Toaster.jsx
import { useRef, useState, useEffect } from 'react';
import { useToastStore } from '../store/toasts';

// ── Per-type visual tokens ────────────────────────────────────
// rgba hex values used because CSS variables cannot be used inside rgba()
// They match: --pe-danger #FF4560, --pe-success #00E5A0, --pe-warning #FFB020
const COLORS = {
  error:   { bg: 'rgba(255,69,96,0.12)',  border: 'rgba(255,69,96,0.3)',  accent: 'var(--pe-danger)'   },
  success: { bg: 'rgba(0,229,160,0.12)',  border: 'rgba(0,229,160,0.3)',  accent: 'var(--pe-success)'  },
  warning: { bg: 'rgba(255,176,32,0.12)', border: 'rgba(255,176,32,0.3)', accent: 'var(--pe-warning)'  },
};

const AUTO_DISMISS_MS = { error: 4000, success: 3000, warning: 3000 };

// Inline SVG icons — no external dependency
const ICONS = {
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 8l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.5L13.5 12H2.5L8 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 6.5v2.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Single toast item ─────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const timerRef    = useRef(null);  // auto-dismiss timer
  const exitTimerRef = useRef(null); // 150ms exit-animation timer

  // Manual dismiss: cancel auto-dismiss, start exit animation
  const dismiss = () => {
    clearTimeout(timerRef.current);
    clearTimeout(exitTimerRef.current);
    setExiting(true);
    exitTimerRef.current = setTimeout(() => onDismiss(toast.id), 150);
  };

  // Auto-dismiss lifecycle
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      exitTimerRef.current = setTimeout(() => onDismiss(toast.id), 150);
    }, AUTO_DISMISS_MS[toast.type] ?? 4000);

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(exitTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only on mount

  const c = COLORS[toast.type] ?? COLORS.error;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: c.bg,
        borderTop: `1px solid ${c.border}`,
        borderRight: `1px solid ${c.border}`,
        borderBottom: `1px solid ${c.border}`,
        borderLeft: `4px solid ${c.accent}`,
        borderRadius: '10px',
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '13px',
        color: 'var(--pe-text)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}
    >
      {/* Left accent icon */}
      <span
        style={{
          color: c.accent,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px 0 14px',
          alignSelf: 'stretch',
          paddingTop: '14px',
          paddingBottom: '14px',
        }}
      >
        {ICONS[toast.type]}
      </span>

      {/* Message */}
      <span style={{ flex: 1, padding: '14px 4px', lineHeight: '1.4', wordBreak: 'break-word' }}>
        {toast.message}
      </span>

      {/* Dismiss button — 64×64px tap target (CLAUDE.md requirement) */}
      <button
        onClick={dismiss}
        aria-label="Schließen"
        style={{
          minWidth: '64px',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--pe-text-muted)',
          fontSize: '16px',
          flexShrink: 0,
          transition: 'color 150ms ease',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--pe-text)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--pe-text-muted)'; }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Toaster overlay ───────────────────────────────────────────
export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(400px, calc(100vw - 32px))',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '8px',
        // Outer container: pointer-events none so it doesn't block clicks
        // Individual toasts restore pointer-events
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/components/Toaster.jsx
git commit -m "feat: add Toaster component with PE design and animation lifecycle"
```

---

### Task 4: Wire `<Toaster />` into `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

**Context:** The current `App()` return is:
```jsx
return (
  <Suspense fallback={<LazyFallback />}>
    <ThemeLoader />
    <Routes>...</Routes>
  </Suspense>
);
```
`<Toaster />` must live **outside** `<Suspense>` so it stays mounted during lazy-route loading. This requires wrapping both in a React Fragment.

- [ ] **Step 1: Add import**

In `frontend/src/App.jsx`, add after the existing imports:

```js
import Toaster from './components/Toaster';
```

- [ ] **Step 2: Wrap return in Fragment, place `<Toaster />` outside `<Suspense>`**

Change the `App()` return from:
```jsx
return (
  <Suspense fallback={<LazyFallback />}>
    <ThemeLoader />
    <Routes>
      ...
    </Routes>
  </Suspense>
);
```
to:
```jsx
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

- [ ] **Step 3: Verify build**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build
```

Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/App.jsx
git commit -m "feat: mount Toaster at app root outside Suspense"
```

---

## Chunk 2: Callsite migration

**Pattern for all error replacements:**
```js
// Before:
alert(err.message || 'Some fallback');
// After (add useToastStore import at top of file, destructure addToast):
const { addToast } = useToastStore();
addToast({ type: 'error', message: err.message || 'Some fallback' });
```

**Import line to add at the top of each file:**
```js
import { useToastStore } from '../store/toasts';
```
(Adjust path based on file location — see per-file notes below.)

**Destructure `addToast` inside the component function:**
```js
const { addToast } = useToastStore();
```

---

### Task 5: Migrate GastronomyPage and RefereePage

**Files:**
- Modify: `frontend/src/pages/GastronomyPage.jsx`
- Modify: `frontend/src/pages/RefereePage.jsx`

#### GastronomyPage.jsx — 5 error toasts

Import path: `'../store/toasts'`

Replace these 5 `alert()` calls (preserve `err.message || fallback`):

| Line | Replace with |
|------|-------------|
| 144  | `addToast({ type: 'error', message: err.message \|\| 'Gast nicht gefunden' })` |
| 191  | `addToast({ type: 'error', message: err.message \|\| 'Bestellung fehlgeschlagen – bitte erneut versuchen' })` |
| 225  | `addToast({ type: 'error', message: err.message \|\| 'Abrechnung fehlgeschlagen – bitte erneut versuchen' })` |
| 244  | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 355  | `.catch((err) => addToast({ type: 'error', message: err.message \|\| 'Gast konnte nicht angelegt werden' }))` |

#### RefereePage.jsx — 5 error toasts

Import path: `'../store/toasts'`

| Line | Replace with |
|------|-------------|
| 104  | `addToast({ type: 'error', message: err.message \|\| 'Fehler' })` |
| 421  | `addToast({ type: 'error', message: err.message \|\| 'Fehler beim Überspringen' })` |
| 573  | `addToast({ type: 'error', message: err.message \|\| 'Fehler' })` |
| 946  | `addToast({ type: 'error', message: err.message \|\| 'Fehler' })` |
| 956  | `addToast({ type: 'error', message: err.message \|\| 'Fehler' })` |

- [ ] **Step 1: Apply changes to GastronomyPage.jsx**

Add import and `const { addToast } = useToastStore();` inside the component, then replace all 5 `alert()` calls.

- [ ] **Step 2: Apply changes to RefereePage.jsx**

Add import at top of file:
```js
import { useToastStore } from '../store/toasts';
```

**IMPORTANT:** RefereePage.jsx contains multiple top-level sub-component functions. Add `const { addToast } = useToastStore();` individually inside each function that has an `alert()` call:

| Function | Defined at line | alert() calls at lines |
|----------|-----------------|----------------------|
| `BulloffPanel` | ~85 | 104 |
| `GameQueue` | ~402 | 421 |
| `TabletLayout` | ~556 | 573 |
| `RefereePage` | ~878 | 946, 956 |

Then replace all 5 `alert()` calls per the table above.

- [ ] **Step 3: Verify no alert() remains in these files**

```bash
grep -n "alert(" /home/moritzwolf/dartsturnier/frontend/src/pages/GastronomyPage.jsx /home/moritzwolf/dartsturnier/frontend/src/pages/RefereePage.jsx
```

Expected: no output.

- [ ] **Step 4: Verify build**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/pages/GastronomyPage.jsx frontend/src/pages/RefereePage.jsx
git commit -m "feat: replace alert() with toast in GastronomyPage and RefereePage"
```

---

### Task 6: Migrate AdminPage

**Files:**
- Modify: `frontend/src/pages/AdminPage.jsx`

Import path: `'../store/toasts'`

**Note:** AdminPage is a large file (2000+ lines). Add `const { addToast } = useToastStore();` near the top of the default-exported component function.

Replace all 19 `alert()` calls:

| Line  | Type    | Replace with |
|-------|---------|-------------|
| 137   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 204   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 215   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 307   | error   | `addToast({ type: 'error', message: err.message \|\| 'Spieler konnte nicht angelegt werden' })` |
| 335   | error   | `addToast({ type: 'error', message: err.message \|\| 'Spieler konnte nicht gespeichert werden' })` |
| 466   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 502   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen' })` |
| 517   | error   | `addToast({ type: 'error', message: err.message \|\| 'Speichern fehlgeschlagen' })` |
| 523   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen' })` |
| 652   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 659   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 667   | error   | `addToast({ type: 'error', message: err.message \|\| 'Löschen fehlgeschlagen' })` |
| 818   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 827   | success | `addToast({ type: 'success', message: 'Test-Mail gesendet!' })` *(no err.message — literal success string)* |
| 830   | error   | `addToast({ type: 'error', message: err.message \|\| 'Fehler beim Senden' })` |
| 841   | success | `addToast({ type: 'success', message: 'Event-Zusammenfassung gesendet!' })` *(no err.message — literal success string)* |
| 843   | error   | `addToast({ type: 'error', message: err.message \|\| 'Aktion fehlgeschlagen – bitte erneut versuchen' })` |
| 2058  | error   | `addToast({ type: 'error', message: err.message \|\| 'Speichern fehlgeschlagen' })` |
| 2072  | error   | `addToast({ type: 'error', message: err.message \|\| 'Reset fehlgeschlagen' })` |

- [ ] **Step 1: Add import at top of file**

```js
import { useToastStore } from '../store/toasts';
```

- [ ] **Step 2: Add `const { addToast } = useToastStore();` inside each of the 5 sub-component functions that contain alert() calls**

**IMPORTANT:** AdminPage.jsx contains many top-level sub-component functions. `addToast` must be destructured individually inside each function that has an `alert()` call — you cannot place it in the default-exported `AdminPage` function and share it. Add one line to each of these function bodies:

| Function | Defined at line | alert() calls at lines |
|----------|-----------------|----------------------|
| `BoardsTab` | ~103 | 137, 204, 215 |
| `PlayersTab` | ~240 | 307, 335, 466, 502, 517, 523 |
| `GastroAdminTab` | ~629 | 652, 659, 667 |
| `MailingTab` | ~797 | 818, 827, 830, 841, 843 |
| `SettingsTab` | ~1988 | 2058, 2072 |

- [ ] **Step 3: Replace all 19 alert() calls per the table above**

- [ ] **Step 4: Verify no alert() remains**

```bash
grep -n "alert(" /home/moritzwolf/dartsturnier/frontend/src/pages/AdminPage.jsx
```

Expected: no output.

- [ ] **Step 5: Verify build**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/pages/AdminPage.jsx
git commit -m "feat: replace alert() with toast in AdminPage (19 callsites, 2 success toasts)"
```

---

### Task 7: Migrate TournamentManager, BulloffScreen, ThrowInput

**Files:**
- Modify: `frontend/src/components/admin/TournamentManager.jsx`
- Modify: `frontend/src/components/game/BulloffScreen.jsx`
- Modify: `frontend/src/components/game/ThrowInput.jsx`

**Import paths** (these are in `components/` subdirectories, one level deeper):
- `TournamentManager.jsx`: `import { useToastStore } from '../../store/toasts';`
- `BulloffScreen.jsx`: `import { useToastStore } from '../../store/toasts';`
- `ThrowInput.jsx`: `import { useToastStore } from '../../store/toasts';`

#### TournamentManager.jsx — 2 error toasts

| Line | Replace with |
|------|-------------|
| 26   | `addToast({ type: 'error', message: err.message \|\| 'Fehler' })` |
| 37   | `addToast({ type: 'error', message: err.message \|\| 'Fehler beim Starten' })` |

#### BulloffScreen.jsx — 1 error toast

| Line | Replace with |
|------|-------------|
| 13   | `addToast({ type: 'error', message: err.message \|\| 'Fehler beim Ausbullen' })` |

#### ThrowInput.jsx — 1 error toast

| Line | Replace with |
|------|-------------|
| 41   | `addToast({ type: 'error', message: err.message \|\| 'Fehler beim Eintragen' })` |

- [ ] **Step 1: Apply changes to all 3 files**

Add `../../store/toasts` import and `const { addToast } = useToastStore();` in each component, then replace the `alert()` calls.

- [ ] **Step 2: Verify zero alert() calls remain anywhere in the frontend**

```bash
grep -rn "alert(" /home/moritzwolf/dartsturnier/frontend/src
```

Expected: no output.

- [ ] **Step 3: Verify build**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run build
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/components/admin/TournamentManager.jsx \
        frontend/src/components/game/BulloffScreen.jsx \
        frontend/src/components/game/ThrowInput.jsx
git commit -m "feat: replace alert() with toast in TournamentManager, BulloffScreen, ThrowInput"
```

---

## Final verification

After all 7 tasks:

```bash
# Zero alert() calls remain
grep -rn "alert(" /home/moritzwolf/dartsturnier/frontend/src
# Expected: no output

# Build succeeds
cd /home/moritzwolf/dartsturnier/frontend && npm run build
# Expected: exits 0
```
