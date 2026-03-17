// frontend/src/components/TopBar.jsx
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';

const ROLE_PILL = {
  referee:    { bg: 'rgba(255,176,32,0.15)',  color: 'var(--pe-warning)',      border: 'rgba(255,176,32,0.3)',  label: 'Referee' },
  gastronomy: { bg: 'rgba(0,229,160,0.15)',   color: 'var(--pe-success)',      border: 'rgba(0,229,160,0.3)',   label: 'Gastro' },
  admin:      { bg: 'rgba(0,184,255,0.15)',   color: 'var(--pe-cyan-bright)',  border: 'rgba(0,184,255,0.3)',   label: 'Admin' },
  director:   { bg: 'rgba(0,184,255,0.15)',   color: 'var(--pe-cyan-bright)',  border: 'rgba(0,184,255,0.3)',   label: 'Director' },
};

export default function TopBar() {
  const { role, logout } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

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
      fontFamily: 'var(--pe-font-body)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <img
        src="/logo.jpeg"
        alt="DartEvent"
        style={{ height: '32px', flexShrink: 0, objectFit: 'contain' }}
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: role pill + avatar with dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {pill && (
          <span style={{
            background: pill.bg,
            color: pill.color,
            border: `1px solid ${pill.border}`,
            borderRadius: 'var(--pe-radius-md)',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}>
            {pill.label}
          </span>
        )}
        {role && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            {/* Avatar button — opens dropdown, does NOT log out directly */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Benutzermenü öffnen"
              aria-expanded={menuOpen}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                borderRadius: '50%',
                background: 'var(--pe-gradient)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 'bold',
                color: 'var(--pe-text)',
                fontFamily: 'var(--pe-font-body)',
                transition: 'opacity 150ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {initials}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--pe-bg-elevated)',
                border: '1px solid var(--pe-border)',
                borderRadius: 'var(--pe-radius-md)',
                minWidth: '160px',
                padding: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 200,
                fontFamily: 'var(--pe-font-body)',
              }}>
                {pill && (
                  <div style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    color: pill.color,
                    fontWeight: 'bold',
                    borderBottom: '1px solid var(--pe-border)',
                    marginBottom: '6px',
                  }}>
                    {pill.label}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    minHeight: '64px',
                    padding: '10px 12px',
                    background: 'none',
                    border: '1px solid var(--pe-border)',
                    borderRadius: 'var(--pe-radius-sm)',
                    color: 'var(--pe-danger)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    fontFamily: 'var(--pe-font-body)',
                    textAlign: 'left',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,96,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Abmelden
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
