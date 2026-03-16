// frontend/src/components/TopNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public: [
    { icon: '🏠', label: 'Home',          path: '/',                        exact: true },
    { icon: '👤', label: 'Anmelden',      path: '/login',                   exact: false },
  ],
  referee: [
    { icon: '📋', label: 'Meine Boards',  path: '/referee',                 exact: false },
    { icon: '🏆', label: 'Turnier',       path: '/',                        exact: true },
  ],
  gastronomy: [
    { icon: '🛒', label: 'Bestellungen',  path: '/gastronomy',              exact: false, noQuery: true },
    { icon: '💶', label: 'Kasse',         path: '/gastronomy?tab=kasse',    exact: false },
    { icon: '📦', label: 'Produkte',      path: '/gastronomy?tab=products', exact: false },
    { icon: '📡', label: 'NFC',           path: '/nfc-scan',                exact: false },
  ],
  admin: [
    { icon: '🏠', label: 'Home',          path: '/',                        exact: true },
    { icon: '📊', label: 'Übersicht',     path: '/admin',                   exact: false, noQuery: true },
    { icon: '👑', label: 'Turnierleiter', path: '/admin?tab=director',      exact: false },
    { icon: '🏆', label: 'Turniere',      path: '/admin?tab=tournaments',   exact: false },
    { icon: '👥', label: 'Spieler',       path: '/admin?tab=players',       exact: false },
    { icon: '🎯', label: 'Boards',        path: '/admin?tab=boards',        exact: false },
    { icon: '🍽️', label: 'Gastro',        path: '/gastronomy',              exact: false, noQuery: true },
    { icon: '👤', label: 'User',          path: '/admin?tab=users',         exact: false },
    { icon: '📧', label: 'Mailing',       path: '/admin?tab=mailing',       exact: false },
    { icon: '⚙️', label: 'Settings',      path: '/admin?tab=settings',      exact: false },
    { icon: '📋', label: 'System-Log',    path: '/admin?tab=log',           exact: false },
    { icon: '❓', label: 'Hilfe',          path: '/admin?tab=help',          exact: false },
  ],
  director: [
    { icon: '📊', label: 'Übersicht',     path: '/admin',                   exact: false, noQuery: true },
    { icon: '🏆', label: 'Turniere',      path: '/admin?tab=tournaments',   exact: false },
    { icon: '👥', label: 'Spieler',       path: '/admin?tab=players',       exact: false },
    { icon: '🎯', label: 'Boards',        path: '/admin?tab=boards',        exact: false },
    { icon: '📋', label: 'System-Log',    path: '/admin?tab=log',           exact: false },
  ],
};

function isActive(tab, pathname, search) {
  const [base, query] = tab.path.split('?');
  if (tab.exact) return pathname === base;
  if (query) return pathname === base && search === '?' + query;
  if (tab.noQuery) return pathname === base && !search;
  return pathname.startsWith(base);
}

export default function TopNav() {
  const role = useStore(s => s.role);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const tabs = TABS[role] ?? TABS.public;

  return (
    <nav aria-label="Hauptnavigation" style={{
      background: 'var(--pe-bg-card)',
      borderBottom: '1px solid var(--pe-border)',
      display: 'flex', alignItems: 'stretch',
      padding: '0 8px', height: '64px',
      flexShrink: 0, overflowX: 'auto',
      fontFamily: 'var(--pe-font-body)',
      scrollbarWidth: 'none',
    }}>
      {tabs.map((tab) => {
        const active = isActive(tab, pathname, search);
        return (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '0 14px', height: '100%',
              background: 'none', border: 'none',
              borderBottom: active ? '2px solid var(--pe-cyan-bright)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: active ? 'bold' : 'normal',
              color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--pe-font-body)',
              transition: 'color 150ms ease, border-color 150ms ease',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-sub)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-muted)'; }}
          >
            {tab.icon && <span style={{ fontSize: '13px', marginRight: '4px' }}>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
