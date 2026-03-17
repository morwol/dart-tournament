import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function PlayerProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/players/${id}/stats`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--pe-text-sub)' }}>Loading player profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-4">
        <p style={{ color: 'var(--pe-danger)', textAlign: 'center', marginTop: 24 }}>
          {error || 'Player not found.'}
        </p>
      </div>
    );
  }

  const { player, career, tournament_history } = data;

  return (
    <div className="pe-page-enter" style={{ fontFamily: 'var(--pe-font-body)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px 12px 100px' }}>

        {/* Player header */}
        <div style={{ marginTop: 12, marginBottom: 20 }}>
          <h1
            className="pe-font-display"
            style={{
              fontSize: 26,
              fontWeight: 700,
              background: 'var(--pe-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}
          >
            {player.name}
          </h1>
          {player.nickname && (
            <p style={{ fontSize: 13, color: 'var(--pe-text-sub)', margin: '4px 0 0' }}>
              "{player.nickname}"
            </p>
          )}
        </div>

        {/* Career stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}>
          <StatCard label="Tournaments" value={career.tournaments_played} />
          <StatCard label="Tournament Wins" value={career.tournament_wins} color="var(--pe-success)" />
          <StatCard label="Record" value={`${career.wins}W / ${career.losses}L`} />
          <StatCard label="Win Rate" value={career.win_rate != null ? `${career.win_rate.toFixed(0)}%` : '—'} />
          <StatCard label="3-Dart Avg" value={career.three_dart_avg != null ? career.three_dart_avg.toFixed(1) : '—'} color="var(--pe-cyan-bright)" />
          <StatCard label="180s" value={career.one_eighties ?? '—'} color="var(--pe-cyan-bright)" />
          <StatCard label="Checkout %" value={career.checkout_pct != null ? `${career.checkout_pct.toFixed(0)}%` : '—'} />
          <StatCard label="Best Checkout" value={career.highest_checkout ?? '—'} color="var(--pe-warning)" />
          <StatCard label="Best Leg" value={career.best_leg ?? '—'} />
        </div>

        {/* Tournament history */}
        <h2 style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          Tournament History
        </h2>

        {(!tournament_history || tournament_history.length === 0) ? (
          <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', padding: '16px 0' }}>
            No tournament history yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tournament_history.map((t) => (
              <Link
                key={t.tournament_id}
                to={`/history/${t.tournament_id}`}
                className="pe-card-interactive"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  minHeight: 64,
                  borderRadius: 'var(--pe-radius-md)',
                  background: 'var(--pe-bg-card)',
                  border: '1px solid var(--pe-border)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--pe-text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.tournament_name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--pe-text-sub)' }}>
                    {t.date} &middot; {t.format}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span className="pe-font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--pe-text)' }}>
                      {t.wins}W/{t.losses}L
                    </span>
                  </div>
                  {t.is_winner && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: 'var(--pe-radius-lg)',
                      border: '1px solid var(--pe-success)',
                      color: 'var(--pe-success)',
                    }}>
                      Winner
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--pe-bg-card)',
      borderRadius: 'var(--pe-radius-md)',
      border: '1px solid var(--pe-border)',
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span
        className="pe-font-display"
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: color || 'var(--pe-text)',
          letterSpacing: '0.01em',
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
    </div>
  );
}
