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
