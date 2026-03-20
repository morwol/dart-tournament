// frontend/src/components/TopNav.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
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
  { icon: '🏠', label: 'Home',      path: '/',      exact: true },
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
      { icon: '👤', label: 'User',          path: '/admin?tab=users' },
      { icon: '⚙️', label: 'Einstellungen', path: '/admin?tab=settings' },
      { icon: '📋', label: 'System-Log',    path: '/admin?tab=log' },
      { icon: '📈', label: 'Reports',       path: '/admin/reports' },
      { icon: '❓', label: 'Hilfe',          path: '/admin?tab=help' },
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

// ── Nav button styles ─────────────────────────────────────────────────────────
function navBtnStyle(active, height = '100%') {
  return {
    padding: '0 14px',
    height,
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
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  };
}

// ── Admin nav with animated sub-nav bar ───────────────────────────────────────
function AdminNav({ pathname, search }) {
  const navigate = useNavigate();
  // activeGroup: which group's sub-nav is visible (hover or pinned)
  const [activeGroup, setActiveGroup] = useState(null);
  // pinnedGroup: stays open after click until clicked again or route changes
  const [pinnedGroup, setPinnedGroup] = useState(null);
  const wrapperRef = useRef(null);
  const closeTimer = useRef(null);

  // Close sub-nav on route change
  useEffect(() => {
    setActiveGroup(null);
    setPinnedGroup(null);
  }, [pathname, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setActiveGroup(null);
        setPinnedGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Delayed close — allows mouse to travel from main nav to sub-nav without flicker
  const scheduleClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!pinnedGroup) setActiveGroup(null);
    }, 120);
  }, [pinnedGroup]);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  const handleGroupHover = useCallback((label) => {
    cancelClose();
    setActiveGroup(label);
  }, [cancelClose]);

  const handleGroupClick = useCallback((label) => {
    if (pinnedGroup === label) {
      setPinnedGroup(null);
      setActiveGroup(null);
    } else {
      setPinnedGroup(label);
      setActiveGroup(label);
    }
  }, [pinnedGroup]);

  const handleItemClick = useCallback((path) => {
    navigate(path);
    setPinnedGroup(null);
    setActiveGroup(null);
  }, [navigate]);

  const currentGroup = activeGroup
    ? ADMIN_GROUPS.find(g => g.items && g.label === activeGroup)
    : null;

  const subNavOpen = !!currentGroup;

  return (
    <div ref={wrapperRef}>
      {/* ── Main nav bar ── */}
      <nav
        aria-label="Hauptnavigation"
        style={{
          background: 'var(--pe-bg-card)',
          borderBottom: subNavOpen ? 'none' : '1px solid var(--pe-border)',
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
        {ADMIN_GROUPS.map((entry) => {
          if (entry.items) {
            const isOpen = activeGroup === entry.label;
            const anyActive = entry.items.some(item => isActive(item, pathname, search));
            const highlight = isOpen || anyActive;
            return (
              <button
                key={entry.label}
                style={navBtnStyle(highlight)}
                onMouseEnter={() => handleGroupHover(entry.label)}
                onMouseLeave={scheduleClose}
                onClick={() => handleGroupClick(entry.label)}
                aria-expanded={isOpen}
              >
                {entry.label}
                <svg
                  width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
                  style={{
                    transition: 'transform 200ms ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                    opacity: 0.7,
                  }}
                >
                  <path d="M2 3l3 4 3-4H2z" />
                </svg>
              </button>
            );
          }

          // Standalone tab
          const active = isActive(entry, pathname, search);
          return (
            <button
              key={entry.label}
              onClick={() => handleItemClick(entry.path)}
              aria-current={active ? 'page' : undefined}
              style={navBtnStyle(active)}
              onMouseEnter={() => { cancelClose(); if (!pinnedGroup) setActiveGroup(null); }}
              onMouseLeave={scheduleClose}
            >
              {entry.icon && <span style={{ fontSize: '13px' }}>{entry.icon}</span>}
              {entry.label}
            </button>
          );
        })}
      </nav>

      {/* ── Animated sub-nav bar ── */}
      <div
        style={{
          height: subNavOpen ? '52px' : '0',
          overflow: 'hidden',
          transition: 'height 200ms ease',
          background: 'var(--pe-bg-elevated)',
          borderBottom: subNavOpen ? '1px solid var(--pe-border)' : 'none',
          display: 'flex',
          alignItems: 'stretch',
          padding: subNavOpen ? '0 8px' : '0',
          fontFamily: 'var(--pe-font-body)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        {currentGroup?.items.map((item) => {
          const active = isActive(item, pathname, search);
          return (
            <button
              key={item.label}
              onClick={() => handleItemClick(item.path)}
              aria-current={active ? 'page' : undefined}
              style={{
                ...navBtnStyle(active, '52px'),
                fontSize: '12px',
                padding: '0 16px',
                color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)',
              }}
              onMouseEnter={e => {
                cancelClose();
                if (!active) e.currentTarget.style.color = 'var(--pe-text)';
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.color = 'var(--pe-text-sub)';
              }}
            >
              {item.icon && <span style={{ fontSize: '13px' }}>{item.icon}</span>}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main TopNav ───────────────────────────────────────────────────────────────
export default function TopNav() {
  const role = useStore(s => s.role);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  if (role === 'admin') {
    return <AdminNav pathname={pathname} search={search} />;
  }

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
      {(TABS[role] ?? TABS.public).map((tab) => {
        const active = isActive(tab, pathname, search);
        return (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            style={navBtnStyle(active)}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-sub)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--pe-text-muted)'; }}
          >
            {tab.icon && <span style={{ fontSize: '13px' }}>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
