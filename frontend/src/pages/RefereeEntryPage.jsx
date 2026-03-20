// frontend/src/pages/RefereeEntryPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import { useToastStore } from '../store/toasts';

// ── Board picker ────────────────────────────────────────────────────────────
function BoardPicker() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/boards')
      .then(setBoards)
      .catch(() => addToast({ type: 'error', message: 'Boards konnten nicht geladen werden' }))
      .finally(() => setLoading(false));
  }, []);

  const cardStyle = (occupied) => ({
    background: 'var(--pe-bg-card)',
    border: `1px solid ${occupied ? 'var(--pe-danger)' : 'var(--pe-border)'}`,
    borderRadius: 'var(--pe-radius-md)',
    padding: '14px 16px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: occupied ? 'not-allowed' : 'pointer',
    opacity: occupied ? 0.65 : 1,
    fontFamily: 'var(--pe-font-body)',
    transition: 'border-color 120ms',
  });

  const badge = (text, color, bg, border) => (
    <span style={{
      padding: '3px 10px',
      borderRadius: 'var(--pe-radius-xl)',
      fontSize: '11px',
      fontWeight: 'bold',
      color,
      background: bg,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {text}
    </span>
  );

  if (loading) return (
    <p style={{ textAlign: 'center', color: 'var(--pe-text-sub)', padding: '32px' }}>
      Lade Boards...
    </p>
  );

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '16px',
      fontFamily: 'var(--pe-font-body)',
    }}>
      <p style={{
        fontSize: '10px',
        color: 'var(--pe-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '14px',
      }}>
        Board auswählen
      </p>
      {boards.map((board) => {
        const occupied = !!board.referee_name;
        return (
          <div
            key={board.id}
            style={cardStyle(occupied)}
            onClick={() => { if (!occupied) navigate(`/referee/${board.number}`); }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--pe-text)' }}>
                Board {board.number}
              </div>
              {board.name && (
                <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '2px' }}>
                  {board.name}
                </div>
              )}
              {board.current_game && (
                <div style={{ fontSize: '11px', color: 'var(--pe-success)', marginTop: '3px' }}>
                  {'\u25CF'} {board.current_game}
                </div>
              )}
              {occupied && (
                <div style={{ fontSize: '11px', color: 'var(--pe-danger)', marginTop: '2px' }}>
                  Referee: {board.referee_name}
                </div>
              )}
              {!occupied && !board.current_game && (
                <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '3px' }}>
                  Kein Referee zugewiesen
                </div>
              )}
            </div>
            {occupied
              ? badge('Belegt', 'var(--pe-danger)',      'rgba(255,69,96,0.12)',  'rgba(255,69,96,0.3)')
              : badge('Frei',   'var(--pe-cyan-bright)', 'rgba(0,184,255,0.12)', 'rgba(0,184,255,0.3)')}
          </div>
        );
      })}
      {!loading && boards.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--pe-text-muted)', padding: '32px' }}>
          Keine Boards eingerichtet.
        </p>
      )}
    </div>
  );
}

// ── Logout button ────────────────────────────────────────────────────────────
function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <button
      onClick={handleLogout}
      title="Abmelden"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255,69,96,0.12)',
        border: '1px solid rgba(255,69,96,0.3)',
        color: 'var(--pe-danger)',
        borderRadius: '8px',
        padding: '0 14px',
        minHeight: '44px',
        cursor: 'pointer',
        fontFamily: 'var(--pe-font-body)',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'background 150ms, border-color 150ms',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,69,96,0.22)';
        e.currentTarget.style.borderColor = 'rgba(255,69,96,0.6)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,69,96,0.12)';
        e.currentTarget.style.borderColor = 'rgba(255,69,96,0.3)';
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Abmelden
    </button>
  );
}

// ── Entry point ─────────────────────────────────────────────────────────────
// Standalone page (no AppShell). Auth is handled by ProtectedRoute in App.jsx.
export default function RefereeEntryPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--pe-bg)' }}>
      <TopBar />
      {/* Sub-header: page title + logout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--pe-border)',
        fontFamily: 'var(--pe-font-body)',
      }}>
        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--pe-text)' }}>
          Referee
        </span>
        <LogoutButton />
      </div>
      <BoardPicker />
    </div>
  );
}
