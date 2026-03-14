export default function Bracket({ games }) {
  const rounds = {};
  games.forEach((g) => {
    if (!rounds[g.round]) rounds[g.round] = [];
    rounds[g.round].push(g);
  });

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max pb-4">
        {roundNumbers.map((round) => (
          <div key={round} className="flex flex-col gap-4 min-w-[200px]">
            <h3 className="text-sm font-bold text-center mb-2" style={{ color: 'var(--pe-text-muted)' }}>
              Runde {round}
            </h3>
            {rounds[round].map((game) => (
              <div
                key={game.id}
                className="block rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--pe-border)' }}
              >
                <PlayerSlot
                  name={game.player1_name || 'TBD'}
                  isWinner={game.winner_id === game.player1_id}
                  finished={game.status === 'finished'}
                />
                <div style={{ height: '1px', background: 'var(--pe-border)' }} />
                <PlayerSlot
                  name={game.player2_name || 'TBD'}
                  isWinner={game.winner_id === game.player2_id}
                  finished={game.status === 'finished'}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerSlot({ name, isWinner, finished }) {
  let bgColor = 'var(--pe-bg-card)';
  let textColor = 'var(--pe-text)';
  if (finished && isWinner) {
    bgColor = 'var(--pe-bg-elevated)';
    textColor = 'var(--pe-success)';
  } else if (finished && !isWinner) {
    textColor = 'var(--pe-text-muted)';
  }

  return (
    <div className="px-3 py-2 text-sm font-bold" style={{ background: bgColor, color: textColor }}>
      {name}
    </div>
  );
}
