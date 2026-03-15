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
            padding: '12px',
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
            margin: '0 0 0 -12px',
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
