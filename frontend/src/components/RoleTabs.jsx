// frontend/src/components/RoleTabs.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const TABS = {
  public:     [
    { label: 'Home',    path: '/' },
    { label: 'Turnier', path: '/' },
  ],
  referee:    [
    { label: 'Boards',  path: '/referee' },
    { label: 'Turnier', path: '/' },
  ],
  gastronomy: [
    { label: 'Bestellungen', path: '/gastronomy' },
    { label: 'Produkte',     path: '/gastronomy?tab=products' },
    { label: 'NFC',          path: '/nfc-scan' },
  ],
  admin: [
    { label: 'Home',   path: '/' },
    { label: 'Boards', path: '/admin?tab=boards' },
    { label: 'Gastro', path: '/gastronomy' },
    { label: 'Admin',  path: '/admin' },
  ],
  director: [
    { label: 'Home',    path: '/' },
    { label: 'Boards',  path: '/admin?tab=boards' },
    { label: 'Spieler', path: '/admin?tab=players' },
  ],
};

export default function RoleTabs() {
  const { role } = useStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const tabs = TABS[role] ?? TABS.public;

  const isActive = (tabPath) => {
    const [tabBase, tabQuery] = tabPath.split('?');
    if (tabBase === '/') return pathname === '/' && !search;

    // If this tab has a query string (e.g. ?tab=boards), also match the query
    if (tabQuery) {
      return pathname.startsWith(tabBase) && search === '?' + tabQuery;
    }

    // For tabs without query string, only mark active if no conflicting tab with
    // the same base path and a query string would match instead
    const hasQueryVariant = tabs.some(t => {
      const [b, q] = t.path.split('?');
      return q && b === tabBase && search === '?' + q;
    });
    if (hasQueryVariant) return false;

    return pathname.startsWith(tabBase);
  };

  return (
    <nav
      aria-label="Hauptnavigation"
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
            key={tab.path}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
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
              transition: 'color 200ms ease, border-color 200ms ease',
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
