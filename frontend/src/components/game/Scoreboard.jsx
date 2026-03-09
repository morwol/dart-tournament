export default function Scoreboard({ game }) {
  const p1 = game.player1 || {};
  const p2 = game.player2 || {};

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}
    >
      <div className="grid grid-cols-2 gap-4 text-center">
        <PlayerScore
          name={p1.name || game.player1_name || 'Spieler 1'}
          remaining={p1.remaining ?? game.start_score}
          lastThrows={p1.last_throws || []}
          isActive={game.current_player_id === game.player1_id}
        />
        <PlayerScore
          name={p2.name || game.player2_name || 'Spieler 2'}
          remaining={p2.remaining ?? game.start_score}
          lastThrows={p2.last_throws || []}
          isActive={game.current_player_id === game.player2_id}
        />
      </div>
    </div>
  );
}

function PlayerScore({ name, remaining, lastThrows, isActive }) {
  return (
    <div>
      <p
        className="text-sm font-bold mb-2 truncate"
        style={{ color: isActive ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)' }}
      >
        {isActive && '\u25B6 '}{name}
      </p>
      <p className="text-4xl font-bold mb-2" style={{ color: 'var(--pe-text)' }}>
        {remaining}
      </p>
      {lastThrows.length > 0 && (
        <div className="flex justify-center gap-1">
          {lastThrows.slice(-3).map((t, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-muted)' }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
