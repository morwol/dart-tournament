import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import Scoreboard from '../components/game/Scoreboard';
import ThrowInput from '../components/game/ThrowInput';
import BulloffScreen from '../components/game/BulloffScreen';
import CheckoutSuggestions from '../components/game/CheckoutSuggestions';

export default function GamePage() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGame = () => {
    api.get(`/games/${id}`).then(setGame).catch(() => {});
  };

  useEffect(() => {
    api.get(`/games/${id}`)
      .then(setGame)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!game || game.status === 'finished') return;
    const interval = setInterval(fetchGame, 5000);
    return () => clearInterval(interval);
  }, [id, game?.status]);

  if (loading) return <div className="p-4 text-center" style={{ color: 'var(--pe-text-sub)' }}>Lade Spiel...</div>;
  if (!game) return <div className="p-4 text-center" style={{ color: 'var(--pe-danger)' }}>Spiel nicht gefunden.</div>;

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link to={game.tournament_id ? `/tournament/${game.tournament_id}` : '/'} className="text-2xl no-underline" style={{ color: 'var(--pe-text-sub)' }}>
          &larr;
        </Link>
        <img src="/logo.jpeg" alt="DartEvent" className="h-10" />
      </div>

      {game.status === 'bulloff' && (
        <BulloffScreen game={game} onComplete={fetchGame} />
      )}

      {game.status === 'active' && (
        <>
          <Scoreboard game={game} />
          {game.checkout_suggestions && game.checkout_suggestions.length > 0 && (
            <CheckoutSuggestions suggestions={game.checkout_suggestions} />
          )}
          <ThrowInput game={game} onThrow={fetchGame} />
        </>
      )}

      {game.status === 'finished' && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--pe-success)' }}>
            Spiel beendet!
          </h2>
          <p className="text-xl mb-2" style={{ color: 'var(--pe-text)' }}>
            Gewinner: <strong>{game.winner_name || 'N/A'}</strong>
          </p>
          <Scoreboard game={game} />
        </div>
      )}

      {game.status === 'pending' && (
        <div className="text-center py-12">
          <p className="text-lg" style={{ color: 'var(--pe-text-sub)' }}>Spiel wartet auf Start...</p>
        </div>
      )}
    </div>
  );
}
