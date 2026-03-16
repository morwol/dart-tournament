// frontend/src/components/TopNav.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public: [
    { label: 'Home',          path: '/',                     exact: true },
    { label: 'Turnier',       path: '/',                     exact: true },
  ],
  referee: [
    { label: 'Meine Boards',  path: '/referee',              exact: false },
    { label: 'Turnier',       path: '/',                     exact: true },
  ],
  gastronomy: [
    { label: 'Bestellungen',  path: '/gastronomy',           exact: false, noQuery: true },
    { label: 'Kasse',         path: '/gastronomy?tab=kasse', exact: false },
    { label: 'Produkte',      path: '/gastronomy?tab=products', exact: false },
    { label: 'NFC',           path: '/nfc-scan',             exact: false },
  ],
  admin: [
    { label: 'Übersicht',     path: '/admin',                exact: false, noQuery: true },
    { label: 'Turnierleiter', path: '/admin?tab=director',   exact: false },
    { label: 'Turniere',      path: '/admin?tab=tournaments',exact: false },
    { label: 'Spieler',       path: '/admin?tab=players',    exact: false },
    { label: 'Boards',        path: '/admin?tab=boards',     exact: false },
    { label: 'Gastro',        path: '/gastronomy',           exact: false, noQuery: true },
    { label: 'User',          path: '/admin?tab=users',      exact: false },
    { label: 'Mailing',       path: '/admin?tab=mailing',    exact: false },
    { label: 'Settings',      path: '/admin?tab=settings',   exact: false },
    { label: 'System-Log',    path: '/admin?tab=log',        exact: false },
    { label: 'Hilfe',         path: '/admin?tab=help',       exact: false },
  ],
  director: [
    { label: 'Übersicht',     path: '/admin',                exact: false, noQuery: true },
    { label: 'Turniere',      path: '/admin?tab=tournaments',exact: false },
    { label: 'Spieler',       path: '/admin?tab=players',    exact: false },
    { label: 'Boards',        path: '/admin?tab=boards',     exact: false },
    { label: 'System-Log',    path: '/admin?tab=log',        exact: false },
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
      padding: '0 8px', height: '48px',
      flexShrink: 0, overflowX: 'auto',
      fontFamily: 'Verdana, Geneva, sans-serif',
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
