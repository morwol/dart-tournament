// NEU: CurrentGameView — Vollbild Board-Ansicht für Beamer/TV
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

// NEU: Wurf-Notation Parser (z.B. "S20 (20) + T19 (57) + D16 (32) = 109")
function formatThrows(throws) {
  if (!throws || throws.length === 0) return null;
  const recent = throws.slice(-3);
  return recent.map((t) => `${t.score}`).join(' + ');
}

// NEU: YouTube Embed Modal
function YouTubeModal({ url, onClose }) {
  if (!url) return null;
  const videoId = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
  if (!videoId) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.9)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div style={{ width: '80vw', maxWidth: 900, aspectRatio: '16/9' }} onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="Walk-On Song"
        />
      </div>
    </div>
  );
}

export default function CurrentGameView() {
  const { boardId } = useParams();
  const [currentGame, setCurrentGame] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [nextGame, setNextGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const [playerStats, setPlayerStats] = useState({ p1: null, p2: null });

  // NEU: Auto-Refresh alle 2 Sekunden
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const current = await api.get(`/boards/${boardId}/current-game`);
        if (!active) return;
        setCurrentGame(current);

        if (current && current.game_id) {
          const game = await api.get(`/games/${current.game_id}`);
          if (!active) return;
          setGameData(game);

          // Load player stats for both players
          if (game.player1?.id) {
            api.get(`/boards/${boardId}/player-stats/${game.player1.id}`)
              .then(s => { if (active) setPlayerStats(prev => ({ ...prev, p1: s })); })
              .catch(() => {});
          }
          if (game.player2?.id) {
            api.get(`/boards/${boardId}/player-stats/${game.player2.id}`)
              .then(s => { if (active) setPlayerStats(prev => ({ ...prev, p2: s })); })
              .catch(() => {});
          }
        } else {
          setGameData(null);
          setPlayerStats({ p1: null, p2: null });
        }

        const next = await api.get(`/boards/${boardId}/next-game`);
        if (!active) return;
        setNextGame(next);
      } catch {
        // ignore fetch errors
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [boardId]);

  // NEU: Runden-Label für KO-Phase
  const getRoundLabel = (round, totalRounds) => {
    if (!round) return '';
    const remaining = totalRounds - round;
    if (remaining === 0) return 'Finale';
    if (remaining === 1) return 'Halbfinale';
    if (remaining === 2) return 'Viertelfinale';
    return `Runde ${round}`;
  };

  // NEU: Prüfe ob Viertelfinale+ (für Walk-On Song)
  const isQuarterOrLater = (round) => {
    if (!round || !gameData) return false;
    return round >= 3; // Runde 3+ = mindestens Viertelfinale bei 8+ Spielern
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: 'var(--pe-text-sub)', textAlign: 'center', marginTop: 100 }}>
          Lade Board-Daten...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* NEU: YouTube Modal */}
      {youtubeUrl && <YouTubeModal url={youtubeUrl} onClose={() => setYoutubeUrl(null)} />}

      {/* NEU: Gradient Header */}
      <div style={styles.header}>
        <img src="/logo.jpeg" alt="DartEvent" style={styles.logo} />
        <div style={styles.headerCenter}>
          <span style={styles.boardLabel}>Board {currentGame?.board_number || boardId}</span>
          {gameData && (
            <span style={styles.roundLabel}>
              {getRoundLabel(gameData.game?.round, 5)}
            </span>
          )}
        </div>
        <span style={styles.brandText}>P Entertainment</span>
      </div>

      {/* NEU: Spieler-Bereich */}
      {gameData ? (
        <>
          <div style={styles.playersRow}>
            {/* Spieler 1 */}
            <div style={styles.playerCard}>
              <div style={styles.playerName}>{gameData.player1?.name || 'TBD'}</div>
              <div style={styles.playerScore}>{gameData.player1?.remaining ?? '---'}</div>
              <div style={styles.playerAvg}>
                Avg: {calcAverage(gameData.player1?.throws)}
              </div>
              {/* Stat Badges */}
              {playerStats.p1 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                  {playerStats.p1.fav_single && (
                    <span style={{ fontSize: '12px', color: 'var(--pe-text-muted)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: '6px', padding: '2px 8px' }}>
                      ♦ {playerStats.p1.fav_single} ({playerStats.p1.fav_single_count}x)
                    </span>
                  )}
                  {playerStats.p1.fav_double && (
                    <span style={{ fontSize: '12px', color: 'var(--pe-warning)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: '6px', padding: '2px 8px' }}>
                      ⊙ {playerStats.p1.fav_double} ({playerStats.p1.fav_double_count}x)
                    </span>
                  )}
                </div>
              )}
              {/* NEU: Walk-On Song Button bei Viertelfinale+ */}
              {isQuarterOrLater(gameData.game?.round) && currentGame?.player1_walkon && (
                <button
                  style={styles.walkOnBtn}
                  onClick={() => setYoutubeUrl(currentGame.player1_walkon)}
                >
                  Walk-On Song
                </button>
              )}
            </div>

            {/* VS */}
            <div style={styles.vsSection}>
              <span style={styles.vsText}>vs</span>
              <div style={styles.statusBadge}>
                {gameData.game?.status === 'bulloff' ? 'Ausbullen' :
                 gameData.game?.status === 'active' ? 'Live' :
                 gameData.game?.status === 'finished' ? 'Beendet' : 'Wartend'}
              </div>
            </div>

            {/* Spieler 2 */}
            <div style={styles.playerCard}>
              <div style={styles.playerName}>{gameData.player2?.name || 'TBD'}</div>
              <div style={styles.playerScore}>{gameData.player2?.remaining ?? '---'}</div>
              <div style={styles.playerAvg}>
                Avg: {calcAverage(gameData.player2?.throws)}
              </div>
              {/* Stat Badges */}
              {playerStats.p2 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                  {playerStats.p2.fav_single && (
                    <span style={{ fontSize: '12px', color: 'var(--pe-text-muted)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: '6px', padding: '2px 8px' }}>
                      ♦ {playerStats.p2.fav_single} ({playerStats.p2.fav_single_count}x)
                    </span>
                  )}
                  {playerStats.p2.fav_double && (
                    <span style={{ fontSize: '12px', color: 'var(--pe-warning)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: '6px', padding: '2px 8px' }}>
                      ⊙ {playerStats.p2.fav_double} ({playerStats.p2.fav_double_count}x)
                    </span>
                  )}
                </div>
              )}
              {isQuarterOrLater(gameData.game?.round) && currentGame?.player2_walkon && (
                <button
                  style={styles.walkOnBtn}
                  onClick={() => setYoutubeUrl(currentGame.player2_walkon)}
                >
                  Walk-On Song
                </button>
              )}
            </div>
          </div>

          {/* NEU: Aktuelle Würfe */}
          <div style={styles.throwsSection}>
            <div style={styles.throwsTitle}>Aktuelle Würfe</div>
            <div style={styles.throwsRow}>
              <div style={styles.throwsPlayer}>
                {formatLastThrows(gameData.player1?.throws) || '—'}
              </div>
              <div style={styles.throwsDivider} />
              <div style={styles.throwsPlayer}>
                {formatLastThrows(gameData.player2?.throws) || '—'}
              </div>
            </div>
          </div>

          {/* NEU: Checkout Suggestions */}
          {gameData.game?.status === 'active' && (
            <div style={styles.checkoutRow}>
              <div style={styles.checkoutSide}>
                {gameData.player1?.checkout_suggestions?.length > 0 && (
                  <span style={styles.checkoutText}>
                    Checkout: {gameData.player1.checkout_suggestions[0]}
                  </span>
                )}
              </div>
              <div style={styles.checkoutSide}>
                {gameData.player2?.checkout_suggestions?.length > 0 && (
                  <span style={styles.checkoutText}>
                    Checkout: {gameData.player2.checkout_suggestions[0]}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* NEU: Gewinner-Anzeige */}
          {gameData.game?.status === 'finished' && gameData.game?.winner_id && (
            <div style={styles.winnerBanner}>
              Gewinner: {gameData.game.winner_id === gameData.player1?.id
                ? gameData.player1?.name
                : gameData.player2?.name}
            </div>
          )}
        </>
      ) : (
        <div style={styles.noGame}>
          <div style={styles.noGameText}>Kein aktives Spiel</div>
          <div style={styles.noGameSub}>Warte auf nächstes Spiel...</div>
        </div>
      )}

      {/* NEU: Nächstes Spiel */}
      {nextGame && (
        <div style={styles.nextGame}>
          <span style={styles.nextGameLabel}>Nächstes Spiel:</span>
          <span style={styles.nextGamePlayers}>
            {nextGame.player1_name || 'TBD'} vs. {nextGame.player2_name || 'TBD'}
          </span>
        </div>
      )}
    </div>
  );
}

// NEU: Average berechnen
function calcAverage(throws) {
  if (!throws || throws.length === 0) return '0.0';
  const total = throws.reduce((sum, t) => sum + t.score, 0);
  return (total / throws.length).toFixed(1);
}

// NEU: Letzte 3 Würfe formatieren
function formatLastThrows(throws) {
  if (!throws || throws.length === 0) return null;
  const last3 = throws.slice(-3);
  const parts = last3.map((t) => t.score);
  const sum = parts.reduce((a, b) => a + b, 0);
  return `${parts.join(' + ')} = ${sum}`;
}

// NEU: Styles für Vollbild Board-Ansicht (Desktop/TV optimiert)
const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--pe-bg)',
    fontFamily: 'Verdana, Geneva, sans-serif',
    color: 'var(--pe-text)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB, #1A4FD6)',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    height: 48,
    borderRadius: 8,
  },
  headerCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  boardLabel: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  roundLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  brandText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
  },
  playersRow: {
    display: 'flex',
    alignItems: 'stretch',
    flex: 1,
    padding: '24px 32px',
    gap: 16,
  },
  playerCard: {
    flex: 1,
    background: 'var(--pe-bg-card)',
    borderRadius: 16,
    border: '1px solid var(--pe-border)',
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  playerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
    textAlign: 'center',
  },
  playerScore: {
    fontSize: 80,
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: 1,
  },
  playerAvg: {
    fontSize: 18,
    color: 'var(--pe-text-sub)',
  },
  walkOnBtn: {
    marginTop: 8,
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid var(--pe-cyan-bright)',
    background: 'transparent',
    color: 'var(--pe-cyan-bright)',
    fontFamily: 'Verdana, Geneva, sans-serif',
    fontSize: 13,
    fontWeight: 'bold',
    cursor: 'pointer',
    minHeight: 44,
  },
  vsSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minWidth: 80,
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'var(--pe-text-muted)',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'var(--pe-success)',
    border: '1px solid var(--pe-success)',
    borderRadius: 20,
    padding: '4px 12px',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  throwsSection: {
    margin: '0 32px',
    background: 'var(--pe-bg-elevated)',
    borderRadius: 12,
    border: '1px solid var(--pe-border)',
    padding: '16px 24px',
  },
  throwsTitle: {
    fontSize: 13,
    color: 'var(--pe-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  throwsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  throwsPlayer: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
  },
  throwsDivider: {
    width: 1,
    height: 32,
    background: 'var(--pe-border)',
  },
  checkoutRow: {
    display: 'flex',
    margin: '12px 32px 0',
    gap: 96,
    justifyContent: 'space-between',
  },
  checkoutSide: {
    flex: 1,
    textAlign: 'center',
  },
  checkoutText: {
    fontSize: 14,
    color: 'var(--pe-warning)',
    fontWeight: 'bold',
  },
  winnerBanner: {
    margin: '16px 32px',
    padding: '16px 24px',
    borderRadius: 12,
    background: 'rgba(0, 229, 160, 0.15)',
    border: '1px solid var(--pe-success)',
    color: 'var(--pe-success)',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nextGame: {
    margin: '16px 32px 24px',
    padding: '14px 24px',
    borderRadius: 12,
    background: 'var(--pe-bg-card)',
    border: '1px solid var(--pe-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  nextGameLabel: {
    fontSize: 14,
    color: 'var(--pe-text-muted)',
    fontWeight: 'bold',
  },
  nextGamePlayers: {
    fontSize: 18,
    color: 'var(--pe-text)',
    fontWeight: 'bold',
  },
  noGame: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noGameText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'var(--pe-text-muted)',
  },
  noGameSub: {
    fontSize: 16,
    color: 'var(--pe-text-muted)',
  },
};
