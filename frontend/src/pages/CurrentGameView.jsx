// CurrentGameView — Board-Ansicht für TV/Beamer und Mobile
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

function YouTubeModal({ url, onClose }) {
  if (!url) return null;
  const videoId = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
  if (!videoId) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ width: '80vw', maxWidth: 900, aspectRatio: '16/9' }} onClick={e => e.stopPropagation()}>
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

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function CurrentGameView() {
  const { boardId } = useParams();
  const [currentGame, setCurrentGame] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [nextGame, setNextGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const [playerStats, setPlayerStats] = useState({ p1: null, p2: null });
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 1024;

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
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [boardId]);

  const getRoundLabel = (round, totalRounds) => {
    if (!round) return '';
    const remaining = totalRounds - round;
    if (remaining === 0) return 'Finale';
    if (remaining === 1) return 'Halbfinale';
    if (remaining === 2) return 'Viertelfinale';
    return `Runde ${round}`;
  };

  const isQuarterOrLater = (round) => round && gameData && round >= 3;

  // Responsive scale factors
  const px = isMobile ? 0.55 : isTablet ? 0.75 : 1;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--pe-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Verdana, Geneva, sans-serif' }}>
        <p style={{ color: 'var(--pe-text-sub)' }}>Lade Board-Daten...</p>
      </div>
    );
  }

  const hPad = isMobile ? '12px 16px' : '16px 32px';
  const secPad = isMobile ? '0 12px' : isTablet ? '0 20px' : '0 32px';
  const secMar = isMobile ? '8px 12px' : isTablet ? '12px 20px' : '16px 32px';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pe-bg)', fontFamily: 'Verdana, Geneva, sans-serif', color: 'var(--pe-text)', display: 'flex', flexDirection: 'column' }}>
      {youtubeUrl && <YouTubeModal url={youtubeUrl} onClose={() => setYoutubeUrl(null)} />}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB, #1A4FD6)', padding: hPad, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo.jpeg" alt="DartEvent" style={{ height: isMobile ? 32 : 48, borderRadius: 8, flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: isMobile ? 18 : isTablet ? 22 : 28, fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            Board {currentGame?.board_number || boardId}
          </span>
          {gameData && (
            <span style={{ fontSize: isMobile ? 10 : 14, color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: isMobile ? 1 : 2 }}>
              {getRoundLabel(gameData.game?.round, 5)}
            </span>
          )}
        </div>
        <span style={{ fontSize: isMobile ? 11 : 14, fontWeight: 'bold', color: 'rgba(255,255,255,0.9)', textAlign: 'right' }}>P Entertainment</span>
      </div>

      {/* Players */}
      {gameData ? (
        <>
          {/* On mobile: column (stacked), on desktop: row (side by side) */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch', flex: 1, padding: isMobile ? '12px' : isTablet ? '16px 20px' : '24px 32px', gap: isMobile ? 0 : 16 }}>
            {/* Player 1 */}
            <div style={{ flex: 1, background: 'var(--pe-bg-card)', borderRadius: isMobile ? '12px 12px 0 0' : 16, border: '1px solid var(--pe-border)', borderBottom: isMobile ? 'none' : '1px solid var(--pe-border)', padding: isMobile ? '20px 20px 16px' : isTablet ? '20px 16px' : 32, display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: isMobile ? 12 : 12 }}>
              {isMobile ? (
                // Mobile: name left, score right
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--pe-text)', lineHeight: 1.2, wordBreak: 'break-word' }}>
                      {gameData.player1?.name || 'TBD'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--pe-text-sub)' }}>Avg: {calcAverage(gameData.player1?.throws)}</div>
                    {playerStats.p1?.fav_single && <span style={{ fontSize: 11, color: 'var(--pe-text-muted)' }}>♦ {playerStats.p1.fav_single} ({playerStats.p1.fav_single_count}x)</span>}
                    {isQuarterOrLater(gameData.game?.round) && currentGame?.player1_walkon && (
                      <button style={{ marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--pe-cyan-bright)', background: 'transparent', color: 'var(--pe-cyan-bright)', fontFamily: 'Verdana, Geneva, sans-serif', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }} onClick={() => setYoutubeUrl(currentGame.player1_walkon)}>Walk-On</button>
                    )}
                  </div>
                  <div style={{ fontSize: 64, fontWeight: 'bold', background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, flexShrink: 0 }}>
                    {gameData.player1?.remaining ?? '---'}
                  </div>
                </>
              ) : (
                // Desktop: vertical centered
                <>
                  <div style={{ fontSize: Math.round(32 * px), fontWeight: 'bold', color: 'var(--pe-text)', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {gameData.player1?.name || 'TBD'}
                  </div>
                  <div style={{ fontSize: Math.round(80 * px), fontWeight: 'bold', background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                    {gameData.player1?.remaining ?? '---'}
                  </div>
                  <div style={{ fontSize: Math.round(18 * px), color: 'var(--pe-text-sub)' }}>Avg: {calcAverage(gameData.player1?.throws)}</div>
                  {playerStats.p1 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {playerStats.p1.fav_single && <span style={{ fontSize: 12, color: 'var(--pe-text-muted)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: 6, padding: '2px 8px' }}>♦ {playerStats.p1.fav_single} ({playerStats.p1.fav_single_count}x)</span>}
                      {playerStats.p1.fav_double && <span style={{ fontSize: 12, color: 'var(--pe-warning)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: 6, padding: '2px 8px' }}>⊙ {playerStats.p1.fav_double} ({playerStats.p1.fav_double_count}x)</span>}
                    </div>
                  )}
                  {isQuarterOrLater(gameData.game?.round) && currentGame?.player1_walkon && (
                    <button style={{ marginTop: 4, padding: '10px 20px', borderRadius: 8, border: '1px solid var(--pe-cyan-bright)', background: 'transparent', color: 'var(--pe-cyan-bright)', fontFamily: 'Verdana, Geneva, sans-serif', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', minHeight: 44 }} onClick={() => setYoutubeUrl(currentGame.player1_walkon)}>Walk-On</button>
                  )}
                </>
              )}
            </div>

            {/* VS — horizontal bar on mobile, vertical column on desktop */}
            {isMobile ? (
              <div style={{ background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderTop: 'none', borderBottom: 'none', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ height: 1, flex: 1, background: 'var(--pe-border)' }} />
                <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--pe-text-muted)' }}>vs</span>
                <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--pe-success)', border: '1px solid var(--pe-success)', borderRadius: 20, padding: '3px 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {gameData.game?.status === 'bulloff' ? 'Ausbullen' : gameData.game?.status === 'active' ? 'Live' : gameData.game?.status === 'finished' ? 'Beendet' : '—'}
                </div>
                <div style={{ height: 1, flex: 1, background: 'var(--pe-border)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minWidth: 80 }}>
                <span style={{ fontSize: Math.round(24 * px), fontWeight: 'bold', color: 'var(--pe-text-muted)' }}>vs</span>
                <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--pe-success)', border: '1px solid var(--pe-success)', borderRadius: 20, padding: '4px 12px', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
                  {gameData.game?.status === 'bulloff' ? 'Ausbullen' : gameData.game?.status === 'active' ? 'Live' : gameData.game?.status === 'finished' ? 'Beendet' : '—'}
                </div>
              </div>
            )}

            {/* Player 2 */}
            <div style={{ flex: 1, background: 'var(--pe-bg-card)', borderRadius: isMobile ? '0 0 12px 12px' : 16, border: '1px solid var(--pe-border)', borderTop: isMobile ? 'none' : '1px solid var(--pe-border)', padding: isMobile ? '16px 20px 20px' : isTablet ? '20px 16px' : 32, display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: isMobile ? 12 : 12 }}>
              {isMobile ? (
                // Mobile: score left, name right (mirrored from player 1)
                <>
                  <div style={{ fontSize: 64, fontWeight: 'bold', background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, flexShrink: 0 }}>
                    {gameData.player2?.remaining ?? '---'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--pe-text)', lineHeight: 1.2, wordBreak: 'break-word', textAlign: 'right' }}>
                      {gameData.player2?.name || 'TBD'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--pe-text-sub)' }}>Avg: {calcAverage(gameData.player2?.throws)}</div>
                    {playerStats.p2?.fav_single && <span style={{ fontSize: 11, color: 'var(--pe-text-muted)' }}>{playerStats.p2.fav_single} ({playerStats.p2.fav_single_count}x) ♦</span>}
                    {isQuarterOrLater(gameData.game?.round) && currentGame?.player2_walkon && (
                      <button style={{ marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--pe-cyan-bright)', background: 'transparent', color: 'var(--pe-cyan-bright)', fontFamily: 'Verdana, Geneva, sans-serif', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-end' }} onClick={() => setYoutubeUrl(currentGame.player2_walkon)}>Walk-On</button>
                    )}
                  </div>
                </>
              ) : (
                // Desktop: vertical centered
                <>
                  <div style={{ fontSize: Math.round(32 * px), fontWeight: 'bold', color: 'var(--pe-text)', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {gameData.player2?.name || 'TBD'}
                  </div>
                  <div style={{ fontSize: Math.round(80 * px), fontWeight: 'bold', background: 'linear-gradient(135deg, #5DD5FF, #1E7FEB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                    {gameData.player2?.remaining ?? '---'}
                  </div>
                  <div style={{ fontSize: Math.round(18 * px), color: 'var(--pe-text-sub)' }}>Avg: {calcAverage(gameData.player2?.throws)}</div>
                  {playerStats.p2 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {playerStats.p2.fav_single && <span style={{ fontSize: 12, color: 'var(--pe-text-muted)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: 6, padding: '2px 8px' }}>♦ {playerStats.p2.fav_single} ({playerStats.p2.fav_single_count}x)</span>}
                      {playerStats.p2.fav_double && <span style={{ fontSize: 12, color: 'var(--pe-warning)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', borderRadius: 6, padding: '2px 8px' }}>⊙ {playerStats.p2.fav_double} ({playerStats.p2.fav_double_count}x)</span>}
                    </div>
                  )}
                  {isQuarterOrLater(gameData.game?.round) && currentGame?.player2_walkon && (
                    <button style={{ marginTop: 4, padding: '10px 20px', borderRadius: 8, border: '1px solid var(--pe-cyan-bright)', background: 'transparent', color: 'var(--pe-cyan-bright)', fontFamily: 'Verdana, Geneva, sans-serif', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', minHeight: 44 }} onClick={() => setYoutubeUrl(currentGame.player2_walkon)}>Walk-On</button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Aktuelle Würfe */}
          <div style={{ margin: secMar, background: 'var(--pe-bg-elevated)', borderRadius: 12, border: '1px solid var(--pe-border)', padding: isMobile ? '10px 12px' : '16px 24px' }}>
            <div style={{ fontSize: isMobile ? 10 : 13, color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: isMobile ? 4 : 8, textAlign: 'center' }}>Aktuelle Würfe</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
              <div style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? 13 : 20, fontWeight: 'bold', color: 'var(--pe-text)' }}>
                {formatLastThrows(gameData.player1?.throws) || '—'}
              </div>
              <div style={{ width: 1, height: isMobile ? 20 : 32, background: 'var(--pe-border)', flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? 13 : 20, fontWeight: 'bold', color: 'var(--pe-text)' }}>
                {formatLastThrows(gameData.player2?.throws) || '—'}
              </div>
            </div>
          </div>

          {/* Checkout */}
          {gameData.game?.status === 'active' && (
            <div style={{ display: 'flex', margin: isMobile ? '6px 12px 0' : '12px 32px 0', gap: isMobile ? 8 : 96, justifyContent: 'space-between' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {gameData.player1?.checkout_suggestions?.length > 0 && (
                  <span style={{ fontSize: isMobile ? 12 : 14, color: 'var(--pe-warning)', fontWeight: 'bold' }}>
                    Checkout: {gameData.player1.checkout_suggestions[0]}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {gameData.player2?.checkout_suggestions?.length > 0 && (
                  <span style={{ fontSize: isMobile ? 12 : 14, color: 'var(--pe-warning)', fontWeight: 'bold' }}>
                    Checkout: {gameData.player2.checkout_suggestions[0]}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Gewinner */}
          {gameData.game?.status === 'finished' && gameData.game?.winner_id && (
            <div style={{ margin: secMar, padding: isMobile ? '12px 16px' : '16px 24px', borderRadius: 12, background: 'rgba(0,229,160,0.15)', border: '1px solid var(--pe-success)', color: 'var(--pe-success)', fontSize: isMobile ? 20 : 28, fontWeight: 'bold', textAlign: 'center' }}>
              Gewinner: {gameData.game.winner_id === gameData.player1?.id ? gameData.player1?.name : gameData.player2?.name}
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: isMobile ? 22 : 32, fontWeight: 'bold', color: 'var(--pe-text-muted)' }}>Kein aktives Spiel</div>
          <div style={{ fontSize: isMobile ? 14 : 16, color: 'var(--pe-text-muted)' }}>Warte auf nächstes Spiel...</div>
        </div>
      )}

      {/* Nächstes Spiel */}
      {nextGame && (
        <div style={{ margin: isMobile ? '8px 12px 16px' : '16px 32px 24px', padding: isMobile ? '10px 14px' : '14px 24px', borderRadius: 12, background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 6 : 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: isMobile ? 11 : 14, color: 'var(--pe-text-muted)', fontWeight: 'bold' }}>Nächstes Spiel:</span>
          <span style={{ fontSize: isMobile ? 14 : 18, color: 'var(--pe-text)', fontWeight: 'bold', textAlign: 'center' }}>
            {nextGame.player1_name || 'TBD'} vs. {nextGame.player2_name || 'TBD'}
          </span>
        </div>
      )}
    </div>
  );
}

function calcAverage(throws) {
  if (!throws || throws.length === 0) return '0.0';
  const total = throws.reduce((sum, t) => sum + t.score, 0);
  return (total / throws.length).toFixed(1);
}

function formatLastThrows(throws) {
  if (!throws || throws.length === 0) return null;
  const last3 = throws.slice(-3);
  const parts = last3.map(t => t.score);
  const sum = parts.reduce((a, b) => a + b, 0);
  return `${parts.join(' + ')} = ${sum}`;
}
