import { useState } from 'react';
import { api } from '../../api/client';

// GastronomyLogin — shown when no gastronomy token is present
// Props: onLogin(token: string) => void
export default function GastronomyLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', form);
      if (!['admin', 'gastronomy'].includes(data.user?.role)) {
        setError('Keine Berechtigung für die Gastronomie.');
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
    minHeight: '64px',
    borderRadius: '12px',
    padding: '0 16px',
    width: '100%',
    outline: 'none',
    fontSize: '16px',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="DartEvent" style={{ height: '64px', marginBottom: '16px' }} />
          <h1
            style={{
              background: 'var(--pe-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
              fontSize: '20px',
              margin: 0,
            }}
          >
            Gastronomie
          </h1>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Benutzername"
            style={inp}
            autoComplete="username"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Passwort"
            style={inp}
            autoComplete="current-password"
          />
          {error && (
            <p style={{ color: 'var(--pe-danger)', fontSize: '14px', textAlign: 'center', margin: 0 }}>
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
              cursor: loading ? 'not-allowed' : 'pointer',
              minHeight: '64px',
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
