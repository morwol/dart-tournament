// frontend/src/components/TopNav.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

// ── Flat tab definitions (public, referee, gastronomy, director) ─────────────
const TABS = {
  public: [
    { icon: '🏠', label: 'Home',          path: '/',                        exact: true },
    { icon: '📜', label: 'Archiv',        path: '/history',                 exact: false },
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
  director: [
    { icon: '📊', label: 'Übersicht',     path: '/admin',                   exact: false, noQuery: true },
    { icon: '🏆', label: 'Turniere',      path: '/admin?tab=tournaments',   exact: false },
    { icon: '👥', label: 'Spieler',       path: '/admin?tab=players',       exact: false },
    { icon: '🎯', label: 'Boards',        path: '/admin?tab=boards',        exact: false },
    { icon: '📋', label: 'System-Log',    path: '/admin?tab=log',           exact: false },
    { icon: '📜', label: 'Archiv',        path: '/history',                 exact: false },
  ],
};

// ── Admin grouped nav definition ─────────────────────────────────────────────
const ADMIN_GROUPS = [
  { icon: '🏠', label: 'Home',     path: '/',       exact: true },
  { icon: '📊', label: 'Übersicht', path: '/admin', noQuery: true },
  {
    label: 'Turnier',
    items: [
      { icon: '👑', label: 'Turnierleiter', path: '/admin?tab=director' },
      { icon: '🏆', label: 'Turniere',      path: '/admin?tab=tournaments' },
    ],
  },
  {
    label: 'Spieler',
    items: [
      { icon: '👥', label: 'Spieler', path: '/admin?tab=players' },
      { icon: '🎯', label: 'Boards',  path: '/admin?tab=boards' },
    ],
  },
  {
    label: 'Betrieb',
    items: [
      { icon: '🍽️', label: 'Gastro',  path: '/gastronomy', noQuery: true },
      { icon: '📧', label: 'Mailing', path: '/admin?tab=mailing' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: '👤', label: 'User',           path: '/admin?tab=users' },
      { icon: '⚙️', label: 'Einstellungen',  path: '/admin?tab=settings' },
      { icon: '📋', label: 'System-Log',     path: '/admin?tab=log' },
      { icon: '📈', label: 'Reports',        path: '/admin/reports' },
      { icon: '❓', label: 'Hilfe',           path: '/admin?tab=help' },
    ],
  },
  { icon: '📜', label: 'Archiv', path: '/history' },
];

// ── isActive helper ───────────────────────────────────────────────────────────
function isActive(tab, pathname, search) {
  const [base, query] = tab.path.split('?');
  if (tab.exact) return pathname === base;
  if (query) return pathname === base && search === '?' + query;
  if (tab.noQuery) return pathname === base && !search;
  return pathname.startsWith(base);
}

// ── Shared nav button style ───────────────────────────────────────────────────
function navButtonStyle(active) {
  return {
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
    fontFamily: 'var(--pe-font-body)',
    transition: 'color 150ms ease, border-color 150ms ease',
  };
}

// ── Dropdown group component ──────────────────────────────────────────────────
function DropdownGroup({ group, pathname, search, navigate, openGroup, setOpenGroup }) {
  const groupRef = useRef(null);
  const isOpen = openGroup === group.label;

  // Check if any sub-item is active
  const anyActive = group.items.some(item => isActive(item, pathname, search));

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen, setOpenGroup]);

  return (
    <div ref={groupRef} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'stretch' }}>
      <button
        onClick={() => setOpenGroup(isOpen ? null : group.label)}
        aria-expanded={isOpen}
        style={{
          ...navButtonStyle(anyActive),
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onMouseEnter={e => { if (!anyActive) e.currentTarget.style.color = 'var(--pe-text-sub)'; }}
        onMouseLeave={e => { if (!anyActive) e.currentTarget.style.color = 'var(--pe-text-muted)'; }}
      >
        {group.label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          style={{ transition: 'transform 150ms', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M2 3l3 4 3-4H2z" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 1000,
          background: 'var(--pe-bg-card)',
          border: '1px solid var(--pe-border)',
          borderRadius: '10px',
          minWidth: '164px',
          padding: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          fontFamily: 'var(--pe-font-body)',
        }}>
          {group.items.map((item) => {
            const active = isActive(item, pathname, search);
            return (
              <button
                key={item.label}
                onClick={() => { navigate(item.path); setOpenGroup(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  minHeight: '40px',
                  padding: '8px 12px',
                  background: active ? 'rgba(0,184,255,0.1)' : 'none',
                  border: 'none',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: active ? 'bold' : 'normal',
                  color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)',
                  fontFamily: 'var(--pe-font-body)',
                  textAlign: 'left',
                  transition: 'background 120ms, color 120ms',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--pe-bg-elevated)';
                    e.currentTarget.style.color = 'var(--pe-text)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = 'var(--pe-text-sub)';
                  }
                }}
              >
                {item.icon && <span style={{ fontSize: '13px', flexShrink: 0 }}>{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Admin nav (grouped) ───────────────────────────────────────────────────────
function AdminNav({ pathname, search }) {
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState(null);

  return (
    <>
      {ADMIN_GROUPS.map((entry) => {
        // Grouped dropdown
        if (entry.items) {
          return (
            <DropdownGroup
              key={entry.label}
              group={entry}
              pathname={pathname}
              search={search}
              navigate={navigate}
              openGroup={openGroup}
              setOpenGroup={setOpenGroup}
            />
          );
        }

        // Standalone flat tab
        const active = isActive(entry, pathname, search);
        return (
          <button
            key={entry.label}
            onClick={() => { navigate(entry.path); setOpenGroup(null); }}
            aria-current={active ? 'page' : undefined}
            style={navButtonStyle(active)}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-sub)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-muted)'; }}
          >
            {entry.icon && <span style={{ fontSize: '13px', marginRight: '4px' }}>{entry.icon}</span>}
            {entry.label}
          </button>
        );
      })}
    </>
  );
}

// ── Main TopNav ───────────────────────────────────────────────────────────────
export default function TopNav() {
  const role = useStore(s => s.role);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        background: 'var(--pe-bg-card)',
        borderBottom: '1px solid var(--pe-border)',
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 8px',
        height: '64px',
        flexShrink: 0,
        overflowX: 'auto',
        fontFamily: 'var(--pe-font-body)',
        scrollbarWidth: 'none',
      }}
    >
      {role === 'admin' ? (
        <AdminNav pathname={pathname} search={search} />
      ) : (
        (TABS[role] ?? TABS.public).map((tab) => {
          const active = isActive(tab, pathname, search);
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              style={navButtonStyle(active)}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-sub)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-muted)'; }}
            >
              {tab.icon && <span style={{ fontSize: '13px', marginRight: '4px' }}>{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })
      )}
    </nav>
  );
}
