import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import Bracket from '../components/tournament/Bracket';

export default function TournamentPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/tournaments/${id}`),
      api.get(`/tournaments/${id}/players`),
    ])
      .then(([t, p]) => { setTournament(t); setPlayers(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!tournament || tournament.status === 'finished') return;
    const interval = setInterval(() => {
      api.get(`/tournaments/${id}`).then(setTournament).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [id, tournament?.status]);

  if (loading) return <div className="p-4 text-center" style={{ color: 'var(--pe-text-sub)' }}>Lade...</div>;
  if (!tournament) return <div className="p-4 text-center" style={{ color: 'var(--pe-danger)' }}>Turnier nicht gefunden.</div>;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">

      <h1
        className="text-xl mb-1 pe-font-display"
        style={{ background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}
      >
        {tournament.name}
      </h1>
      <p className="text-sm mb-4" style={{ color: 'var(--pe-text-sub)' }}>
        {tournament.date} &middot; {tournament.format} &middot; {tournament.checkout === 'double_out' ? 'Double Out' : 'Single Out'}
      </p>

      {tournament.status === 'open' && (
        <Link
          to={`/tournament/${id}/register`}
          className="flex items-center justify-center rounded-xl font-bold mb-6 no-underline"
          style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '64px' }}
        >
          Jetzt anmelden
        </Link>
      )}

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--pe-cyan-bright)' }}>
          Spieler ({players.length})
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-lg text-sm"
              style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}
            >
              {p.seed ? `#${p.seed} ` : ''}{p.name}
            </div>
          ))}
        </div>
      </section>

      {tournament.games && tournament.games.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--pe-cyan-bright)' }}>Bracket</h2>
          <Bracket games={tournament.games} />
        </section>
      )}
    </div>
  );
}
