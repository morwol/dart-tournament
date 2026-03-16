// frontend/src/pages/RefereeEntryPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import { useToastStore } from '../store/toasts';

// ── Login form ──────────────────────────────────────────────────────────────
function RefereeLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', form);
      if (!['admin', 'director', 'referee'].includes(data.user?.role)) {
        setError('Keine Berechtigung für den Referee-Bereich.');
        return;
      }
      onLogin(data.token);
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    background: 'var(--pe-bg-card)',
    border: '1px solid var(--pe-border)',
    color: 'var(--pe-text)',
    fontFamily: 'Verdana, Geneva, sans-serif',
    minHeight: '52px',
    borderRadius: '12px',
    padding: '0 16px',
    width: '100%',
    outline: 'none',
    fontSize: '16px',
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Verdana, Geneva, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: '24px',
          fontSize: '18px',
          background: 'var(--pe-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
        }}>
          Referee Login
        </h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="Benutzername"
            style={inp}
          />
          <input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Passwort"
            style={inp}
          />
          {error && (
            <p style={{ color: 'var(--pe-danger)', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !form.username || !form.password}
            style={{
              background: 'var(--pe-gradient)',
              color: 'var(--pe-text)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              minHeight: '56px',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}

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
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: occupied ? 'not-allowed' : 'pointer',
    opacity: occupied ? 0.65 : 1,
    fontFamily: 'Verdana, Geneva, sans-serif',
    transition: 'border-color 120ms',
  });

  const badge = (text, color, bg, border) => (
    <span style={{
      padding: '3px 10px',
      borderRadius: '20px',
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
      fontFamily: 'Verdana, Geneva, sans-serif',
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
                  ● {board.current_game}
                </div>
              )}
              {occupied && (
                <div style={{ fontSize: '11px', color: 'var(--pe-danger)', marginTop: '2px' }}>
                  🔒 Referee: {board.referee_name}
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

// ── Entry point ─────────────────────────────────────────────────────────────
// Standalone page (no AppShell):
//   - Login state:       no TopBar, no nav — just the form
//   - Board picker state: TopBar (logo + avatar) only — no nav
export default function RefereeEntryPage() {
  const { setToken, token } = useStore();

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  if (!token) return <RefereeLogin onLogin={handleLogin} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--pe-bg)' }}>
      <TopBar />
      <BoardPicker />
    </div>
  );
}
