import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import BackButton from '../components/BackButton';

const card = {
  background: 'var(--pe-bg-card)',
  border: '1px solid var(--pe-border)',
  borderRadius: '16px',
  padding: '24px',
};

export default function CancelRegistrationPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);       // Anmeldungs-Info vom Server
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.get(`/registration/cancel/${token}`)
      .then(setInfo)
      .catch(err => setError(err.message || 'Dieser Abmelde-Link ist ungültig oder wurde bereits verwendet.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCancel = async () => {
    if (!confirm(`Wirklich vom Turnier abmelden?`)) return;
    setCancelling(true);
    try {
      const res = await api.del(`/registration/cancel/${token}`);
      setCancelled(true);
      setInfo(prev => ({ ...prev, player_name: res.player_name }));
    } catch (err) {
      setError(err.message || 'Abmeldung fehlgeschlagen – bitte erneut versuchen.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'Verdana, Geneva, sans-serif', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <BackButton to="/" />
        <img src="/logo.jpeg" alt="DartEvent" style={{ height: '38px' }} />
      </div>

      {loading && (
        <p style={{ color: 'var(--pe-text-sub)', textAlign: 'center', marginTop: '60px' }}>Lade...</p>
      )}

      {/* Ungültiger Link */}
      {!loading && error && !cancelled && (
        <div style={{ ...card, border: '1px solid var(--pe-danger)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--pe-danger)', fontWeight: 'bold', fontSize: '18px', marginBottom: '12px' }}>
            Link ungültig
          </h2>
          <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </p>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 24px', background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', minHeight: '64px' }}>
            Zur Startseite
          </Link>
        </div>
      )}

      {/* Bestätigungs-Ansicht — Abmeldung möglich */}
      {!loading && info && !cancelled && info.can_cancel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--pe-text)', margin: 0 }}>
            Anmeldung widerrufen
          </h1>

          {/* Anmeldungs-Info */}
          <div style={card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Angemeldeter Spieler</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--pe-text)' }}>{info.player_name}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Turnier</span>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--pe-cyan-bright)' }}>{info.tournament_name}</span>
                {info.tournament_date && (
                  <span style={{ fontSize: '13px', color: 'var(--pe-text-sub)', display: 'block', marginTop: '2px' }}>{info.tournament_date}</span>
                )}
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Format</span>
                <span style={{ fontSize: '14px', color: 'var(--pe-text-sub)' }}>{info.tournament_format}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.3)' }}>
            <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
              Wenn du auf <strong style={{ color: 'var(--pe-text)' }}>„Abmeldung bestätigen"</strong> klickst, wird deine Teilnahme unwiderruflich storniert. Du kannst dich danach erneut anmelden, solange das Turnier noch offen ist.
            </p>
          </div>

          {error && (
            <p style={{ color: 'var(--pe-danger)', fontSize: '14px', margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{ background: 'var(--pe-danger)', color: 'var(--pe-text)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', minHeight: '64px', cursor: cancelling ? 'wait' : 'pointer', opacity: cancelling ? 0.7 : 1, fontFamily: 'Verdana, Geneva, sans-serif' }}
          >
            {cancelling ? 'Wird abgemeldet...' : 'Abmeldung bestätigen'}
          </button>

          <Link to="/" style={{ textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '64px' }}>
            Abbrechen — zurück zur Startseite
          </Link>
        </div>
      )}

      {/* Turnier bereits gestartet — Abmeldung nicht mehr möglich */}
      {!loading && info && !cancelled && !info.can_cancel && (
        <div style={{ ...card, border: '1px solid var(--pe-warning)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h2 style={{ color: 'var(--pe-warning)', fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
            Abmeldung nicht mehr möglich
          </h2>
          <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', marginBottom: '4px' }}>
            <strong style={{ color: 'var(--pe-text)' }}>{info.player_name}</strong>
          </p>
          <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', marginBottom: '20px' }}>
            Das Turnier <strong style={{ color: 'var(--pe-text)' }}>{info.tournament_name}</strong> hat bereits begonnen. Eine Abmeldung ist nicht mehr möglich.
          </p>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 24px', background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', minHeight: '64px' }}>
            Zur Startseite
          </Link>
        </div>
      )}

      {/* Erfolgreich abgemeldet */}
      {cancelled && (
        <div style={{ ...card, border: '2px solid var(--pe-success)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
          <h2 style={{ color: 'var(--pe-success)', fontWeight: 'bold', fontSize: '20px', marginBottom: '8px' }}>
            Abmeldung erfolgreich
          </h2>
          <p style={{ color: 'var(--pe-text-sub)', fontSize: '15px', marginBottom: '4px' }}>
            <strong style={{ color: 'var(--pe-text)' }}>{info?.player_name}</strong> wurde vom Turnier abgemeldet.
          </p>
          <p style={{ color: 'var(--pe-text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            Du kannst dich jederzeit erneut anmelden, solange die Registrierung noch offen ist.
          </p>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '14px 28px', background: 'var(--pe-gradient)', color: 'var(--pe-text)', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px', minHeight: '64px' }}>
            Zur Startseite
          </Link>
        </div>
      )}
    </div>
  );
}
