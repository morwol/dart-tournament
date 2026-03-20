// frontend/src/pages/LoginSelectionPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store';
import { isTokenValid, parseJwt } from '../lib/parseJwt';

function getRoleRedirect(role) {
  if (role === 'referee') return '/referee';
  if (role === 'gastronomy') return '/gastronomy';
  if (role === 'admin' || role === 'director') return '/admin';
  return '/';
}

const inputStyle = {
  background: 'var(--pe-bg-card)',
  border: '1px solid var(--pe-border)',
  color: 'var(--pe-text)',
  fontFamily: 'var(--pe-font-body)',
  minHeight: '64px',
  borderRadius: '10px',
  padding: '0 16px',
  width: '100%',
  outline: 'none',
  fontSize: '16px',
  boxSizing: 'border-box',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { token, setToken } = useStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect immediately if already authenticated
  useEffect(() => {
    if (isTokenValid(token)) {
      const payload = parseJwt(token);
      navigate(getRoleRedirect(payload?.role), { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', { username: form.username, password: form.password });
      setToken(data.token);
      const payload = parseJwt(data.token);
      navigate(getRoleRedirect(payload?.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !form.username.trim() || !form.password.trim();

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'var(--pe-font-body)',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img
            src="/logo.jpeg"
            alt="DartEvent Logo"
            style={{ width: '72px', height: '72px', objectFit: 'contain', borderRadius: '16px', marginBottom: '16px' }}
          />
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 'bold',
            fontFamily: 'var(--pe-font-display)',
            background: 'var(--pe-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            DartEvent
          </h1>
          <p style={{
            margin: '6px 0 0',
            fontSize: '13px',
            color: 'var(--pe-text-muted)',
          }}>
            Bitte anmelden um fortzufahren
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder="Benutzername"
            autoComplete="username"
            autoFocus
            style={inputStyle}
          />
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Passwort"
            autoComplete="current-password"
            style={inputStyle}
          />

          {error && (
            <p style={{
              margin: 0,
              color: 'var(--pe-danger)',
              fontSize: '14px',
              textAlign: 'center',
              padding: '8px 12px',
              background: 'rgba(255,69,96,0.1)',
              border: '1px solid rgba(255,69,96,0.3)',
              borderRadius: '8px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isDisabled}
            style={{
              background: isDisabled ? 'var(--pe-bg-elevated)' : 'var(--pe-gradient)',
              color: isDisabled ? 'var(--pe-text-muted)' : 'var(--pe-text)',
              border: 'none',
              borderRadius: '10px',
              padding: '0 16px',
              fontFamily: 'var(--pe-font-body)',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              minHeight: '64px',
              transition: 'opacity 150ms, background 150ms',
              marginTop: '4px',
            }}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
