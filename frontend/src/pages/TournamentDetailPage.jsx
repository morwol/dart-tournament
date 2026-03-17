import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import Bracket from '../components/tournament/Bracket';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    api.get(`/history/${id}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--pe-text-sub)' }}>Loading tournament...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-4">
        <p style={{ color: 'var(--pe-danger)', textAlign: 'center', marginTop: 24 }}>
          {error || 'Tournament not found.'}
        </p>
      </div>
    );
  }

  const { tournament, players, games } = data;

  return (
    <div className="pe-page-enter" style={{ fontFamily: 'var(--pe-font-body)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 12px 100px' }}>

        <div style={{ marginTop: 12 }}>
          <h1
            className="pe-font-display"
            style={{
              fontSize: 22,
              fontWeight: 700,
              background: 'var(--pe-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}
          >
            {tournament.name}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--pe-text-sub)', margin: '4px 0 0' }}>
            {tournament.date} &middot; {tournament.format} &middot;{' '}
            {tournament.checkout === 'double_out' ? 'Double Out' : 'Single Out'}
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'stats', label: 'Player Stats' },
            { id: 'bracket', label: 'Bracket' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0 18px',
                borderRadius: 10,
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'var(--pe-blue-deep)' : 'var(--pe-border)',
                background: activeTab === tab.id ? 'var(--pe-blue-deep)' : 'var(--pe-bg-card)',
                color: activeTab === tab.id ? 'var(--pe-text)' : 'var(--pe-text-sub)',
                fontFamily: 'var(--pe-font-body)',
                fontSize: 14,
                fontWeight: 'bold',
                cursor: 'pointer',
                minHeight: 64,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Player stats table */}
        {activeTab === 'stats' && (
          <div style={{ overflowX: 'auto' }}>
            {players.length === 0 ? (
              <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', padding: '24px 0' }}>
                No player data available.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
                <thead>
                  <tr>
                    {['Player', 'W', 'L', 'Avg', '180s', 'CO%', 'Best CO', 'Best Leg'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === 'Player' ? 'left' : 'center',
                          padding: '8px 10px',
                          fontSize: 11,
                          color: 'var(--pe-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          borderBottom: '1px solid var(--pe-border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--pe-border)' }}>
                      <td style={{ padding: 0 }}>
                        <Link
                          to={`/players/${p.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: 48,
                            padding: '6px 10px',
                            color: 'var(--pe-cyan-bright)',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            fontSize: 14,
                          }}
                        >
                          {p.name}
                        </Link>
                      </td>
                      <StatCell value={p.wins} color="var(--pe-success)" />
                      <StatCell value={p.losses} color="var(--pe-danger)" />
                      <StatCell value={p.three_dart_avg != null ? p.three_dart_avg.toFixed(1) : '—'} />
                      <StatCell value={p.one_eighties ?? '—'} />
                      <StatCell value={p.checkout_pct != null ? `${p.checkout_pct.toFixed(0)}%` : '—'} />
                      <StatCell value={p.highest_checkout ?? '—'} />
                      <StatCell value={p.best_leg ?? '—'} />
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Bracket */}
        {activeTab === 'bracket' && (
          <div style={{ marginTop: 8 }}>
            {games && games.length > 0 ? (
              <Bracket games={games} />
            ) : (
              <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', padding: '24px 0' }}>
                No bracket data available.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({ value, color }) {
  return (
    <td
      className="pe-font-display"
      style={{
        textAlign: 'center',
        padding: '10px',
        fontSize: 14,
        fontWeight: 700,
        color: color || 'var(--pe-text)',
      }}
    >
      {value}
    </td>
  );
}
