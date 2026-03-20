// frontend/src/components/TopNav.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';

// ── Flat tab definitions (public, referee, gastronomy) ───────────────────────
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
};

// ── Rail nav data (admin + director) ─────────────────────────────────────────
const RAIL_GROUPS = {
  admin: [
    { icon: '🏠', label: 'Home',      path: '/',     exact: true },
    { icon: '📊', label: 'Übersicht', path: '/admin', noQuery: true },
    {
      label: 'Turnier', icon: '🏆',
      items: [
        { icon: '👑', label: 'Turnierleiter', path: '/admin?tab=director' },
        { icon: '🏆', label: 'Turniere',      path: '/admin?tab=tournaments' },
      ],
    },
    {
      label: 'Spieler', icon: '👥',
      items: [
        { icon: '👥', label: 'Spieler', path: '/admin?tab=players' },
        { icon: '🎯', label: 'Boards',  path: '/admin?tab=boards' },
      ],
    },
    {
      label: 'Betrieb', icon: '⚡',
      items: [
        { icon: '🍽️', label: 'Gastro',  path: '/gastronomy', noQuery: true },
        { icon: '📧', label: 'Mailing', path: '/admin?tab=mailing' },
      ],
    },
    {
      label: 'System', icon: '⚙️',
      items: [
        { icon: '👤', label: 'User',           path: '/admin?tab=users' },
        { icon: '⚙️', label: 'Einstellungen',  path: '/admin?tab=settings' },
        { icon: '📋', label: 'System-Log',     path: '/admin?tab=log' },
        { icon: '📈', label: 'Reports',        path: '/admin/reports' },
        { icon: '❓', label: 'Hilfe',           path: '/admin?tab=help' },
      ],
    },
    { icon: '📜', label: 'Archiv', path: '/history' },
  ],
  director: [
    { icon: '🏠', label: 'Home',      path: '/',     exact: true },
    { icon: '📊', label: 'Übersicht', path: '/admin', noQuery: true },
    {
      label: 'Turnier', icon: '🏆',
      items: [
        { icon: '🏆', label: 'Turniere', path: '/admin?tab=tournaments' },
      ],
    },
    {
      label: 'Spieler', icon: '👥',
      items: [
        { icon: '👥', label: 'Spieler', path: '/admin?tab=players' },
        { icon: '🎯', label: 'Boards',  path: '/admin?tab=boards' },
      ],
    },
    { icon: '📋', label: 'System-Log', path: '/admin?tab=log' },
    { icon: '📜', label: 'Archiv',     path: '/history' },
  ],
};

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

// ── RailNav: icon rail + slide-out flyout ─────────────────────────────────────
function RailNav({ role }) {
  const navigate  = useNavigate();
  const { pathname, search } = useLocation();
  const { logout } = useStore();
  const [openGroup, setOpenGroup] = useState(null);
  const [animKey,   setAnimKey]   = useState(0);
  const [showLogout, setShowLogout] = useState(false);
  const wrapperRef  = useRef(null);
  const logoutRef   = useRef(null);

  const groups = RAIL_GROUPS[role] ?? RAIL_GROUPS.admin;
  const currentGroup = openGroup
    ? groups.find(g => g.items && g.label === openGroup)
    : null;

  // Close flyout on route change
  useEffect(() => { setOpenGroup(null); }, [pathname, search]);

  // Outside click: close flyout
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Outside click: close logout popover
  useEffect(() => {
    if (!showLogout) return;
    const handler = (e) => {
      if (logoutRef.current && !logoutRef.current.contains(e.target)) {
        setShowLogout(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLogout]);

  const handleRailClick = useCallback((entry) => {
    if (entry.items) {
      if (openGroup === entry.label) {
        setOpenGroup(null);
      } else {
        setAnimKey(k => k + 1);
        setOpenGroup(entry.label);
      }
    } else {
      navigate(entry.path);
      setOpenGroup(null);
    }
  }, [openGroup, navigate]);

  const handleItemClick = useCallback((path) => {
    navigate(path);
    setOpenGroup(null);
  }, [navigate]);

  const isGroupActive = useCallback((entry) => {
    if (!entry.items) return isActive(entry, pathname, search);
    return entry.items.some(item => isActive(item, pathname, search));
  }, [pathname, search]);

  const initials = role.slice(0, 2).toUpperCase();

  return (
    <div
      ref={wrapperRef}
      className={openGroup ? 'rail-no-tooltips' : ''}
      style={{ position: 'relative', display: 'flex', flexShrink: 0 }}
    >
      {/* ── Icon Rail (60px) ── */}
      <div style={{
        width: 60,
        background: 'var(--pe-bg-card)',
        borderRight: '1px solid var(--pe-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        zIndex: 20,
        fontFamily: 'var(--pe-font-body)',
      }}>

        {/* Logo */}
        <img
          src="/logo.jpeg"
          alt="DartEvent"
          style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, marginBottom: 16, flexShrink: 0 }}
        />

        {/* Nav items */}
        {groups.map((entry) => {
          const active  = isGroupActive(entry);
          const isOpen  = !!(entry.items && openGroup === entry.label);
          const highlight = active || isOpen;

          return (
            <button
              key={entry.label}
              className="rail-btn"
              aria-label={entry.label}
              aria-expanded={entry.items ? isOpen : undefined}
              aria-current={!entry.items && active ? 'page' : undefined}
              onClick={() => handleRailClick(entry)}
              style={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                background: highlight
                  ? 'linear-gradient(135deg, #00B8FF25, #1E7FEB15)'
                  : 'none',
                boxShadow: highlight ? '0 0 0 1px #00B8FF30' : 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                margin: '2px 0',
                color: highlight ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)',
                position: 'relative',
                transition: 'background 120ms, box-shadow 120ms, color 120ms, transform 120ms',
                fontFamily: 'var(--pe-font-body)',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!highlight) e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {entry.icon}

              {/* Active accent bar on right edge */}
              {highlight && (
                <span style={{
                  position: 'absolute',
                  right: -1,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 20,
                  background: 'var(--pe-cyan-bright)',
                  borderRadius: '3px 0 0 3px',
                  boxShadow: '0 0 8px var(--pe-cyan-bright)',
                }} />
              )}

              {/* Tooltip (hidden via CSS when flyout open) */}
              <span className="rail-tooltip">{entry.label}</span>
            </button>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User avatar + logout popover */}
        <div ref={logoutRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowLogout(v => !v)}
            aria-label="Benutzermenü öffnen"
            aria-expanded={showLogout}
            aria-haspopup="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--pe-gradient)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'white',
              fontFamily: 'var(--pe-font-body)',
              transition: 'opacity 150ms',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {initials}
          </button>

          {showLogout && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--pe-bg-elevated)',
              border: '1px solid var(--pe-border)',
              borderRadius: 8,
              padding: 8,
              minWidth: 140,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 300,
              fontFamily: 'var(--pe-font-body)',
            }}>
              <div style={{
                padding: '6px 10px 8px',
                fontSize: 11,
                color: 'var(--pe-cyan-bright)',
                fontWeight: 700,
                borderBottom: '1px solid var(--pe-border)',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {role}
              </div>
              <button
                onClick={() => { setShowLogout(false); logout(); navigate('/'); }}
                style={{
                  width: '100%',
                  minHeight: 44,
                  padding: '8px 10px',
                  background: 'none',
                  border: '1px solid var(--pe-border)',
                  borderRadius: 6,
                  color: 'var(--pe-danger)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--pe-font-body)',
                  textAlign: 'left',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,69,96,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Flyout Panel ── width transitions 0→220px, pushing content right in flex layout */}
      <div
        role="navigation"
        aria-label="Unternavigation"
        style={{
          width: currentGroup ? 220 : 0,
          overflow: 'hidden',
          transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
          background: 'var(--pe-bg-elevated)',
          borderRight: currentGroup ? '1px solid var(--pe-border)' : 'none',
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {currentGroup && (
          <div key={animKey} style={{ width: 220, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
              padding: '16px 16px 10px',
              borderBottom: '1px solid var(--pe-border)',
              flexShrink: 0,
              animation: 'rail-flyout-header-in 200ms 50ms cubic-bezier(0.4,0,0.2,1) both',
            }}>
              <div style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--pe-text-muted)',
                marginBottom: 4,
              }}>
                Navigation
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pe-text)' }}>
                {currentGroup.label}
              </div>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '8px 0' }}>
              {currentGroup.items.map((item, i) => {
                const active = isActive(item, pathname, search);
                return (
                  <button
                    key={item.label}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => handleItemClick(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '0 16px',
                      height: 40,
                      fontSize: 13,
                      color: active ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)',
                      background: active ? '#00B8FF10' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--pe-font-body)',
                      transition: 'background 120ms, color 120ms',
                      animation: 'rail-flyout-item-in 220ms cubic-bezier(0.4,0,0.2,1) both',
                      animationDelay: `${70 + i * 40}ms`,
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.color = 'var(--pe-text)'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--pe-text-sub)'; } }}
                  >
                    <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main TopNav ───────────────────────────────────────────────────────────────
export default function TopNav() {
  const role = useStore(s => s.role);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  if (role === 'admin' || role === 'director') {
    return <RailNav role={role} />;
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
