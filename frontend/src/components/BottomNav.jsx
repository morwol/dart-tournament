// frontend/src/components/BottomNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public:     [
    { icon: '🏠', label: 'Home',       path: '/' },
    { icon: '🎯', label: 'Turnier',    path: '/' },
  ],
  referee:    [
    { icon: '📋', label: 'Boards',     path: '/referee' },
    { icon: '🏆', label: 'Turnier',    path: '/' },
  ],
  gastronomy: [
    { icon: '🛒', label: 'Bestellung', path: '/gastronomy' },
    { icon: '💶', label: 'Kasse',      path: '/gastronomy?tab=kasse' },
    { icon: '📦', label: 'Produkte',   path: '/gastronomy?tab=products' },
    { icon: '📡', label: 'NFC',        path: '/nfc-scan' },
  ],
  admin:      [
    { icon: '📊', label: 'Übersicht',  path: '/admin' },
    { icon: '🏆', label: 'Turniere',   path: '/admin?tab=tournaments' },
    { icon: '🎯', label: 'Boards',     path: '/admin?tab=boards' },
    { icon: '⚙️', label: 'Admin',      path: '/admin?tab=settings' },
  ],
  director:   [
    { icon: '📊', label: 'Übersicht',  path: '/admin' },
    { icon: '🏆', label: 'Turniere',   path: '/admin?tab=tournaments' },
    { icon: '👥', label: 'Spieler',    path: '/admin?tab=players' },
    { icon: '🎯', label: 'Boards',     path: '/admin?tab=boards' },
  ],
};

// tabs param: the current role's tab list — needed to correctly detect query-variant tabs
function isTabActive(tab, pathname, search, tabs) {
  const [tabBase, tabQuery] = tab.path.split('?');
  if (tabBase === '/') return pathname === '/' && !search;
  if (tabQuery) return pathname.startsWith(tabBase) && search === '?' + tabQuery;
  // If any other tab in THIS role's list shares the same base path with a query string,
  // and that query-variant is currently active, then this base-only tab is NOT active.
  const hasQueryVariant = tabs.some(
    t => { const [b, q] = t.path.split('?'); return q && b === tabBase && search === '?' + q; }
  );
  if (hasQueryVariant) return false;
  return pathname.startsWith(tabBase);
}

export default function BottomNav() {
  const { role } = useStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const tabs = TABS[role] ?? TABS.public;

  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(80px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--pe-bg-elevated)',
        borderTop: '1px solid var(--pe-border)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 100,
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab, pathname, search, tabs);
        return (
          <button
            key={tab.path + tab.label}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              borderTop: active ? '2px solid var(--pe-cyan-bright)' : '2px solid transparent',
              cursor: 'pointer',
              padding: '0 4px 8px',
              fontFamily: 'Verdana, Geneva, sans-serif',
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
