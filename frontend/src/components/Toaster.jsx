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
  const timerRef     = useRef(null);  // auto-dismiss timer
  const exitTimerRef = useRef(null);  // 150ms exit-animation timer

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
          padding: '14px 10px 14px 14px',
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
