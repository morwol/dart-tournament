import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

const inp = {
  background: 'var(--pe-bg-card)',
  border: '1px solid var(--pe-border)',
  color: 'var(--pe-text)',
  fontFamily: 'Verdana, Geneva, sans-serif',
  fontSize: '16px',
  borderRadius: '12px',
  padding: '16px',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: '64px',
  outline: 'none',
};

const FORMAT_LABELS = {
  '501': '501',
  '301': '301',
  '501_double_out': '501 Double Out',
  '501_single_out': '501 Single Out',
  '301_double_out': '301 Double Out',
  '301_single_out': '301 Single Out',
};

export default function PlayerRegistrationPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [form, setForm] = useState({ vorname: '', nickname: '', nachname: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(null); // { playerName, cancelUrl, cancelToken }

  useEffect(() => {
    api.get(`/tournaments/${id}`)
      .then(data => setTournament(data))
      .catch(() => {});
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSubmit = form.vorname.trim() && form.nickname.trim() && form.nachname.trim();
  const previewName = canSubmit
    ? `${form.vorname.trim()} "${form.nickname.trim()}" ${form.nachname.trim()}`
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post(`/tournaments/${id}/players`, {
        vorname: form.vorname.trim(),
        nickname: form.nickname.trim(),
        nachname: form.nachname.trim(),
      });
      setRegistered({
        playerName: result.name,
        cancelToken: result.cancel_token,
        cancelUrl: result.cancel_url || `${window.location.origin}/cancel/${result.cancel_token}`,
      });
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen – bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Erfolgs-Ansicht ────────────────────────────────────────────────────
  if (registered) {
    const appBaseUrl = window.location.origin;
    const cancelLink = `${appBaseUrl}/cancel/${registered.cancelToken}`;

    return (
      <div style={{ minHeight: '100vh', padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'Verdana, Geneva, sans-serif', boxSizing: 'border-box' }}>

        {/* Erfolgs-Card */}
        <div style={{ background: 'var(--pe-bg-card)', border: '2px solid var(--pe-success)', borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
          <h2 style={{ color: 'var(--pe-success)', fontWeight: 'bold', fontSize: '20px', margin: '0 0 8px' }}>
            Anmeldung erfolgreich!
          </h2>
          <p style={{ color: 'var(--pe-text)', fontSize: '17px', fontWeight: 'bold', margin: '0 0 4px' }}>
            {registered.playerName}
          </p>
          {tournament && (
            <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', margin: 0 }}>
              ist für <strong>{tournament.name}</strong> angemeldet
            </p>
          )}
        </div>

        {/* Abmelde-Link */}
        <div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', fontWeight: 'bold' }}>
            Dein persönlicher Abmelde-Link
          </p>
          <p style={{ color: 'var(--pe-text-sub)', fontSize: '13px', margin: '0 0 12px', lineHeight: '1.5' }}>
            Speichere diesen Link, um deine Anmeldung später widerrufen zu können. Der Link ist nur für dich gültig.
          </p>
          <div style={{ background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: '8px', padding: '12px', wordBreak: 'break-all', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--pe-cyan-bright)', fontFamily: 'monospace' }}>
              {cancelLink}
            </span>
          </div>
          <a
            href={cancelLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold', border: '1px solid var(--pe-border)' }}
          >
            Link öffnen / testen
          </a>
        </div>

        <Link
          to="/"
          style={{ display: 'block', textAlign: 'center', padding: '16px', borderRadius: '12px', background: 'var(--pe-gradient)', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px', minHeight: '56px', lineHeight: '24px' }}
        >
          Zur Turnier-Übersicht
        </Link>
      </div>
    );
  }

  // ── Anmelde-Formular ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'Verdana, Geneva, sans-serif', boxSizing: 'border-box' }}>


      {/* Turnier-Info */}
      {tournament && (
        <div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: 'bold' }}>Turnier</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--pe-text)', margin: '0 0 8px' }}>{tournament.name}</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {tournament.date && (
              <span style={{ fontSize: '13px', color: 'var(--pe-text-sub)' }}>📅 {tournament.date}</span>
            )}
            <span style={{ fontSize: '13px', color: 'var(--pe-text-sub)' }}>
              🎯 {FORMAT_LABELS[tournament.format] || tournament.format}
              {tournament.checkout && ` · ${tournament.checkout === 'double_out' ? 'Double Out' : 'Single Out'}`}
            </span>
          </div>
          {tournament.status !== 'open' && (
            <p style={{ color: 'var(--pe-danger)', fontSize: '13px', margin: '8px 0 0', fontWeight: 'bold' }}>
              Anmeldung geschlossen
            </p>
          )}
        </div>
      )}

      <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Jetzt anmelden
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--pe-text-sub)', marginBottom: '6px', fontWeight: 'bold' }}>Vorname *</label>
          <input type="text" value={form.vorname} onChange={set('vorname')} placeholder="Max" style={inp} autoFocus />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--pe-text-sub)', marginBottom: '6px', fontWeight: 'bold' }}>
            Nickname *
            <span style={{ fontWeight: 'normal', color: 'var(--pe-text-muted)', marginLeft: '8px' }}>muss im Turnier einzigartig sein</span>
          </label>
          <input type="text" value={form.nickname} onChange={set('nickname')} placeholder="The Destroyer" style={inp} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--pe-text-sub)', marginBottom: '6px', fontWeight: 'bold' }}>Nachname *</label>
          <input type="text" value={form.nachname} onChange={set('nachname')} placeholder="Mustermann" style={inp} />
        </div>

        {/* Live Preview */}
        {previewName && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '2px' }}>Angezeigter Name:</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--pe-text)' }}>{previewName}</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,69,96,0.1)', border: '1px solid var(--pe-danger)' }}>
            <p style={{ color: 'var(--pe-danger)', fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit || (tournament && tournament.status !== 'open')}
          style={{
            background: canSubmit ? 'var(--pe-gradient)' : 'var(--pe-bg-elevated)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            minHeight: '64px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
            fontFamily: 'Verdana, Geneva, sans-serif',
            marginTop: '8px',
          }}
        >
          {submitting ? 'Wird angemeldet...' : 'Anmelden'}
        </button>

        <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)', textAlign: 'center', margin: 0, lineHeight: '1.5' }}>
          Nach der Anmeldung erhältst du einen persönlichen Link um deine Teilnahme bei Bedarf zu widerrufen.
        </p>
      </form>
    </div>
  );
}
