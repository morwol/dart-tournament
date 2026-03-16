import { useState } from 'react';
import { api } from '../../api/client';
import { useStore } from '../../store';

export default function AdminLogin() {
  const { setToken } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError('');
    try {
      const { token } = await api.post('/auth/login', { username, password });
      setToken(token);
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto flex flex-col justify-center">
      <div className="flex justify-center mb-8">
        <img src="/logo.jpeg" alt="DartEvent" className="h-20" />
      </div>

      <h1
        className="text-xl font-bold text-center mb-8"
        style={{ background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        Admin Login
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Benutzername"
          className="w-full p-4 rounded-xl outline-none"
          style={{
            background: 'var(--pe-bg-card)',
            border: '1px solid var(--pe-border)',
            color: 'var(--pe-text)',
            minHeight: '64px',
            fontFamily: 'var(--pe-font-body)',
          }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          className="w-full p-4 rounded-xl outline-none"
          style={{
            background: 'var(--pe-bg-card)',
            border: '1px solid var(--pe-border)',
            color: 'var(--pe-text)',
            minHeight: '64px',
            fontFamily: 'var(--pe-font-body)',
          }}
        />

        {error && <p className="text-sm" style={{ color: 'var(--pe-danger)' }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !username.trim() || !password}
          className="w-full py-4 rounded-xl font-bold text-lg disabled:opacity-50"
          style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '64px', fontFamily: 'var(--pe-font-body)' }}
        >
          {submitting ? 'Anmelden...' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}
