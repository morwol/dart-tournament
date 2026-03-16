// frontend/src/components/BottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public: [
    { icon: '🏠', label: 'Home',       path: '/',        exact: true },
    { icon: '📜', label: 'Archiv',     path: '/history', exact: false },
    { icon: '👤', label: 'Anmelden',   path: '/login',   exact: false },
  ],
  referee: [
    { icon: '📋', label: 'Boards',     path: '/referee',             exact: false },
    { icon: '🏆', label: 'Turnier',    path: '/',                    exact: true },
  ],
  gastronomy: [
    { icon: '🛒', label: 'Bestellung', path: '/gastronomy',          exact: false, noQuery: true },
    { icon: '💶', label: 'Kasse',      path: '/gastronomy?tab=kasse',exact: false },
    { icon: '📡', label: 'NFC',        path: '/nfc-scan',            exact: false },
  ],
  admin: [
    { icon: '🏠', label: 'Home',       path: '/',                     exact: true },
    { icon: '📊', label: 'Übersicht',  path: '/admin',                exact: false, noQuery: true },
    { icon: '🏆', label: 'Turniere',   path: '/admin?tab=tournaments',exact: false },
    { icon: '🎯', label: 'Boards',     path: '/admin?tab=boards',     exact: false },
    { icon: '⚙️', label: 'Admin',      path: '/admin?tab=settings',   exact: false },
  ],
  director: [
    { icon: '📊', label: 'Übersicht',  path: '/admin',               exact: false, noQuery: true },
    { icon: '🏆', label: 'Turniere',   path: '/admin?tab=tournaments',exact: false },
    { icon: '👥', label: 'Spieler',    path: '/admin?tab=players',   exact: false },
    { icon: '🎯', label: 'Boards',     path: '/admin?tab=boards',    exact: false },
  ],
};

function isActive(tab, pathname, search) {
  const [base, query] = tab.path.split('?');
  if (tab.exact) return pathname === base;
  if (query) return pathname === base && search === '?' + query;
  if (tab.noQuery) return pathname === base && !search;
  return pathname.startsWith(base);
}

export default function BottomNav() {
  const role = useStore(s => s.role);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const tabs = TABS[role] ?? TABS.public;

  return (
    <nav aria-label="Hauptnavigation" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 'calc(80px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'var(--pe-bg-elevated)',
      borderTop: '1px solid var(--pe-border)',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 100,
      fontFamily: 'Verdana, Geneva, sans-serif',
    }}>
      {tabs.map((tab) => {
        const active = isActive(tab, pathname, search);
        return (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '4px',
              background: 'none', border: 'none',
              borderTop: active ? '2px solid var(--pe-cyan-bright)' : '2px solid transparent',
              cursor: 'pointer',
              padding: '0 4px 8px',
              fontFamily: 'Verdana, Geneva, sans-serif',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: '10px', fontWeight: 'bold',
              color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
