import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function TournamentHistoryPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/history')
      .then(setTournaments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--pe-text-sub)' }}>Loading tournament history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--pe-danger)' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="pe-page-enter" style={{ fontFamily: 'var(--pe-font-body)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px 12px 100px' }}>
        <h1
          className="pe-font-display"
          style={{
            fontSize: 22,
            fontWeight: 700,
            background: 'var(--pe-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '12px 0 16px',
          }}
        >
          Tournament History
        </h1>

        {tournaments.length === 0 ? (
          <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', padding: '32px 0' }}>
            No finished tournaments yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tournaments.map((t) => (
              <Link
                key={t.id}
                to={`/history/${t.id}`}
                className="pe-card-interactive"
                style={{
                  display: 'block',
                  background: 'var(--pe-bg-card)',
                  borderRadius: 14,
                  border: '1px solid var(--pe-border)',
                  padding: 16,
                  minHeight: 64,
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2
                      className="pe-font-display"
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: 'var(--pe-text)',
                        margin: 0,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.name}
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--pe-text-sub)', margin: '4px 0 0' }}>
                      {t.date} &middot; {t.format} &middot; {t.checkout === 'double_out' ? 'Double Out' : 'Single Out'}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: '1px solid var(--pe-text-muted)',
                    color: 'var(--pe-text-muted)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    Finished
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                  {t.winner_name && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="pe-font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--pe-success)' }}>
                        {t.winner_name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Winner
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="pe-font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--pe-cyan-bright)' }}>
                      {t.player_count}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Players
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="pe-font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--pe-cyan-bright)' }}>
                      {t.games_played}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Games
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
