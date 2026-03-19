import { useState } from 'react';
import { api } from '../../api/client';
import { useToastStore } from '../../store/toasts';

export default function BulloffScreen({ game, onComplete }) {
  const { addToast } = useToastStore();
  const [submitting, setSubmitting] = useState(false);

  const handleBulloff = async (playerId, score) => {
    setSubmitting(true);
    try {
      await api.post(`/games/${game.id}/bulloff`, { player_id: playerId, score });
      onComplete();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Fehler beim Ausbullen' });
    } finally {
      setSubmitting(false);
    }
  };

  const p1Name = game.player1_name || 'Spieler 1';
  const p2Name = game.player2_name || 'Spieler 2';

  return (
    <div className="text-center">
      <h2
        className="text-2xl font-bold mb-2"
        style={{ background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        Ausbullen
      </h2>
      <p className="mb-8" style={{ color: 'var(--pe-text-sub)' }}>
        Wirf auf die Bullscheibe!
      </p>

      <div className="space-y-8">
        <BulloffPlayer name={p1Name} playerId={game.player1_id} onScore={handleBulloff} disabled={submitting} />
        <div className="text-lg font-bold" style={{ color: 'var(--pe-text-muted)' }}>VS</div>
        <BulloffPlayer name={p2Name} playerId={game.player2_id} onScore={handleBulloff} disabled={submitting} />
      </div>
    </div>
  );
}

function BulloffPlayer({ name, playerId, onScore, disabled }) {
  return (
    <div>
      <p className="text-lg font-bold mb-3" style={{ color: 'var(--pe-text)' }}>{name}</p>
      <div className="flex justify-center gap-4">
        <button
          onClick={() => onScore(playerId, 25)}
          disabled={disabled}
          className="w-28 rounded-xl font-bold text-lg disabled:opacity-50"
          style={{
            background: 'var(--pe-bg-elevated)',
            border: '1px solid var(--pe-border)',
            color: 'var(--pe-warning)',
            minHeight: '64px',
            fontFamily: 'var(--pe-font-body)',
          }}
        >
          25
        </button>
        <button
          onClick={() => onScore(playerId, 50)}
          disabled={disabled}
          className="w-28 rounded-xl font-bold text-lg disabled:opacity-50"
          style={{
            background: 'var(--pe-bg-elevated)',
            border: '1px solid var(--pe-border)',
            color: 'var(--pe-success)',
            minHeight: '64px',
            fontFamily: 'var(--pe-font-body)',
          }}
        >
          50
        </button>
        <button
          onClick={() => onScore(playerId, 0)}
          disabled={disabled}
          className="w-28 rounded-xl font-bold text-lg disabled:opacity-50"
          style={{
            background: 'var(--pe-bg-elevated)',
            border: '1px solid var(--pe-border)',
            color: 'var(--pe-danger)',
            minHeight: '64px',
            fontFamily: 'var(--pe-font-body)',
          }}
        >
          Miss
        </button>
      </div>
    </div>
  );
}
