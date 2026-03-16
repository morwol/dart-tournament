// frontend/src/components/TopNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public:     [
    { label: 'Home',          path: '/' },
  ],
  referee:    [
    { label: 'Meine Boards',  path: '/referee' },
    { label: 'Turnier',       path: '/' },
  ],
  gastronomy: [
    { label: 'Bestellungen',  path: '/gastronomy' },
    { label: 'Kasse',         path: '/gastronomy?tab=kasse' },
    { label: 'Produkte',      path: '/gastronomy?tab=products' },
    { label: 'NFC',           path: '/nfc-scan' },
  ],
  admin:      [
    { label: 'Übersicht',     path: '/admin' },
    { label: 'Turnierleiter', path: '/admin?tab=director' },
    { label: 'Turniere',      path: '/admin?tab=tournaments' },
    { label: 'Spieler',       path: '/admin?tab=players' },
    { label: 'Boards',        path: '/admin?tab=boards' },
    { label: 'Gastro',        path: '/gastronomy' },
    { label: 'User',          path: '/admin?tab=users' },
    { label: 'Mailing',       path: '/admin?tab=mailing' },
    { label: 'Settings',      path: '/admin?tab=settings' },
    { label: 'System-Log',    path: '/admin?tab=log' },
    { label: 'Hilfe',         path: '/admin?tab=help' },
  ],
  director:   [
    { label: 'Übersicht',     path: '/admin' },
    { label: 'Turniere',      path: '/admin?tab=tournaments' },
    { label: 'Spieler',       path: '/admin?tab=players' },
    { label: 'Boards',        path: '/admin?tab=boards' },
    { label: 'System-Log',    path: '/admin?tab=log' },
  ],
};

// tabs param: the current role's tab list — needed to correctly detect query-variant tabs
function isTabActive(tab, pathname, search, tabs) {
  const [tabBase, tabQuery] = tab.path.split('?');
  if (tabBase === '/') return pathname === '/' && !search;
  if (tabQuery) return pathname.startsWith(tabBase) && search === '?' + tabQuery;
  const hasQueryVariant = tabs.some(
    t => { const [b, q] = t.path.split('?'); return q && b === tabBase && search === '?' + q; }
  );
  if (hasQueryVariant) return false;
  return pathname.startsWith(tabBase);
}

export default function TopNav() {
  const { role } = useStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const tabs = TABS[role] ?? TABS.public;

  return (
    <nav
      aria-label="Hauptnavigation"
      className="pe-scrollbar-hide"
      style={{
        background: 'var(--pe-bg-card)',
        borderBottom: '1px solid var(--pe-border)',
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        padding: '0 8px',
        height: '48px',
        flexShrink: 0,
        overflowX: 'auto',
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
              padding: '0 14px',
              height: '100%',
              background: 'none',
              border: 'none',
              borderBottom: active ? '2px solid var(--pe-cyan-bright)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: active ? 'bold' : 'normal',
              color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
              whiteSpace: 'nowrap',
              fontFamily: 'Verdana, Geneva, sans-serif',
              transition: 'color 150ms ease, border-color 150ms ease',
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
