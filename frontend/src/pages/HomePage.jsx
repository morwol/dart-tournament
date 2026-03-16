// NEU: HomePage komplett überarbeitet — Öffentliche Turnier-Übersicht
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Bracket from '../components/tournament/Bracket';

const statusLabels = { open: 'Offen', active: 'Aktiv', finished: 'Beendet' };
const statusColors = {
  open: 'var(--pe-cyan-bright)',
  active: 'var(--pe-success)',
  finished: 'var(--pe-text-muted)',
};

export default function HomePage() {
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [boardGames, setBoardGames] = useState({});
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  // NEU: Tab-State für Spielerliste / Bracket / Gruppen
  const [activeTab, setActiveTab] = useState('players');
  const [playerSearch, setPlayerSearch] = useState('');
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // NEU: Turnierdaten laden
  const fetchData = useCallback(async () => {
    try {
      const allTournaments = await api.get('/tournaments');
      setTournaments(allTournaments);

      // NEU: Aktives Turnier finden (oder das neueste)
      const active = allTournaments.find((t) => t.status === 'active')
        || allTournaments[0];

      if (active) {
        setActiveTournament(active);

        // NEU: Spielerliste laden
        const tournamentDetail = await api.get(`/tournaments/${active.id}`);
        setPlayers(tournamentDetail.players || []);

        // NEU: Boards laden und aktuelle Spiele pro Board (gefiltert nach aktivem Turnier)
        try {
          const boardList = await api.get(`/boards?tournament_id=${active.id}`);
          setBoards(boardList);

          const gameMap = {};
          for (const board of boardList) {
            try {
              const currentGame = await api.get(`/boards/${board.id}/current-game`);
              const nextGame = await api.get(`/boards/${board.id}/next-game`);
              gameMap[board.id] = { current: currentGame, next: nextGame };
            } catch {
              gameMap[board.id] = { current: null, next: null };
            }
          }
          setBoardGames(gameMap);
        } catch {
          // Boards nicht verfügbar
        }

        // NEU: Gruppen laden falls Gruppenphase
        try {
          const groupData = await api.get(`/tournaments/${active.id}/groups`);
          setGroups(groupData.groups?.length > 0 ? groupData.groups : null);
        } catch {
          setGroups(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // NEU: Auto-Refresh alle 10 Sekunden
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // NEU: Spieler-Statistiken berechnen (W/L, Average, Highest Out)
  const getPlayerStats = (player) => {
    // Stats aus dem Turnier-Detail (falls vom Backend geliefert)
    return {
      wins: player.wins || 0,
      losses: player.losses || 0,
      avg: player.avg ? player.avg.toFixed(1) : '—',
      highestOut: player.highest_out || '—',
    };
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Verdana, Geneva, sans-serif' }}>

      <div style={{ ...styles.content, maxWidth: isDesktop ? 1200 : 600 }}>
        {loading ? (
          <p style={{ color: 'var(--pe-text-sub)', textAlign: 'center' }}>Lade Turniere...</p>
        ) : !activeTournament ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--pe-text-sub)', marginBottom: 24 }}>Keine Turniere vorhanden.</p>
            <Link
              to="/history"
              className="pe-card-interactive"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 24px',
                borderRadius: 12,
                background: 'var(--pe-bg-card)',
                border: '1px solid var(--pe-border)',
                textDecoration: 'none',
                minHeight: 64,
                color: 'var(--pe-text)',
                fontSize: 15,
                fontWeight: 'bold',
              }}
            >
              <span style={{ fontSize: 22 }}>📜</span>
              Turnier-Archiv
            </Link>
          </div>
        ) : (
          <>
            {/* NEU: Aktuelles Turnier Card */}
            <div className="pe-card-interactive" style={styles.tournamentCard}>
              <div style={styles.tournamentHeader}>
                <div>
                  <h2 style={styles.tournamentName}>{activeTournament.name}</h2>
                  <p style={styles.tournamentMeta}>
                    {activeTournament.date} &middot; {activeTournament.format} &middot;{' '}
                    {activeTournament.checkout === 'double_out' ? 'Double Out' : 'Single Out'}
                  </p>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    color: statusColors[activeTournament.status],
                    borderColor: statusColors[activeTournament.status],
                  }}
                >
                  {statusLabels[activeTournament.status] || activeTournament.status}
                </span>
              </div>
              <div style={styles.tournamentStats}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{players.length}</span>
                  <span style={styles.statLabel}>Teilnehmer</span>
                </div>
                {activeTournament.status === 'open' && (
                  <Link
                    to={`/tournament/${activeTournament.id}/register`}
                    style={styles.joinButton}
                  >
                    Beitreten
                  </Link>
                )}
              </div>
            </div>

            {/* NEU: Tab-Navigation */}
            <div style={styles.tabBar}>
              {[
                { id: 'players', label: 'Spieler' },
                { id: 'boards', label: 'Scheiben' },
                ...(groups ? [{ id: 'groups', label: 'Gruppen' }] : []),
                ...(activeTournament.status !== 'open' ? [{ id: 'bracket', label: 'Bracket' }] : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styles.tabButton,
                    ...(activeTab === tab.id ? styles.tabButtonActive : {}),
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* NEU: Spielerliste als Cards */}
            {activeTab === 'players' && (
              <>
                {players.length > 0 && (
                  <input
                    type="search"
                    placeholder="Spieler suchen..."
                    value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--pe-border)', background: 'var(--pe-bg-card)', color: 'var(--pe-text)', fontFamily: 'Verdana, Geneva, sans-serif', fontSize: 14, outline: 'none', minHeight: '64px' }}
                  />
                )}
              <div style={styles.playerGrid}>
                {players.length === 0 ? (
                  <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', gridColumn: '1/-1' }}>
                    Noch keine Spieler angemeldet.
                  </p>
                ) : players.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 ? (
                  <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', gridColumn: '1/-1' }}>
                    Kein Spieler gefunden.
                  </p>
                ) : (
                  players.filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase())).map((player) => {
                    const stats = getPlayerStats(player);
                    return (
                      <div key={player.id} className="pe-card-interactive" style={styles.playerCard}>
                        <div style={styles.playerName}>{player.name}</div>
                        <div style={styles.playerStatsRow}>
                          <div style={styles.playerStat}>
                            <span style={styles.playerStatValue}>
                              {stats.wins}W / {stats.losses}L
                            </span>
                            <span style={styles.playerStatLabel}>Record</span>
                          </div>
                          <div style={styles.playerStat}>
                            <span style={styles.playerStatValue}>{stats.avg}</span>
                            <span style={styles.playerStatLabel}>Average</span>
                          </div>
                          <div style={styles.playerStat}>
                            <span style={styles.playerStatValue}>{stats.highestOut}</span>
                            <span style={styles.playerStatLabel}>Highest Out</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </>
            )}

            {/* NEU: Nächste Spiele pro Scheibe */}
            {activeTab === 'boards' && (
              <div style={styles.boardsList}>
                {boards.length === 0 ? (
                  <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center' }}>
                    Keine Scheiben eingerichtet.
                  </p>
                ) : (
                  boards.map((board) => {
                    const bg = boardGames[board.id];
                    return (
                      <Link
                        key={board.id}
                        to={`/board/${board.number}`}
                        className="pe-card-interactive"
                        style={styles.boardCard}
                      >
                        <div style={styles.boardHeader}>
                          <span style={styles.boardNumber}>Board {board.number}</span>
                          {board.name && (
                            <span style={styles.boardName}>{board.name}</span>
                          )}
                        </div>
                        {bg?.current ? (
                          <div style={styles.boardGame}>
                            <span style={styles.boardGameLabel}>Aktuell:</span>
                            <span style={styles.boardGamePlayers}>
                              {bg.current.player1_name || 'TBD'} vs {bg.current.player2_name || 'TBD'}
                            </span>
                          </div>
                        ) : (
                          <div style={styles.boardGame}>
                            <span style={{ color: 'var(--pe-text-muted)', fontSize: 13 }}>
                              Kein aktives Spiel
                            </span>
                          </div>
                        )}
                        {bg?.next && (
                          <div style={styles.boardGame}>
                            <span style={styles.boardNextLabel}>Nächstes:</span>
                            <span style={styles.boardGamePlayers}>
                              {bg.next.player1_name || 'TBD'} vs {bg.next.player2_name || 'TBD'}
                            </span>
                          </div>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            )}

            {/* NEU: Gruppenübersicht */}
            {activeTab === 'groups' && groups && (
              <div style={styles.groupsList}>
                {(Array.isArray(groups) ? groups : []).map((group, idx) => (
                  <div key={idx} className="pe-card-interactive" style={styles.groupCard}>
                    <h3 style={styles.groupName}>{group.name || `Gruppe ${idx + 1}`}</h3>
                    <table style={styles.groupTable}>
                      <colgroup>
                        <col style={{ width: '55%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '21%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={styles.groupTh}>Spieler</th>
                          <th style={{ ...styles.groupTh, textAlign: 'center' }}>S</th>
                          <th style={{ ...styles.groupTh, textAlign: 'center' }}>N</th>
                          <th style={{ ...styles.groupTh, textAlign: 'center' }}>Pkt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(group.standings || []).map((s, i) => (
                          <tr key={i}>
                            <td style={styles.groupTd}>{s.name}</td>
                            <td style={{ ...styles.groupTd, textAlign: 'center' }}>{s.wins}</td>
                            <td style={{ ...styles.groupTd, textAlign: 'center' }}>{s.losses}</td>
                            <td style={{ ...styles.groupTd, textAlign: 'center', color: 'var(--pe-cyan-bright)' }}>
                              {s.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* NEU: Bracket-Ansicht für KO-Phase */}
            {activeTab === 'bracket' && activeTournament.status !== 'open' && (
              <div style={{ marginTop: 8 }}>
                {activeTournament.games && activeTournament.games.length > 0 ? (
                  <Bracket games={activeTournament.games} />
                ) : (
                  <FetchBracket tournamentId={activeTournament.id} />
                )}
              </div>
            )}

            {/* NEU: Weitere Turniere */}
            {tournaments.length > 1 && (
              <div style={styles.otherTournaments}>
                <h3 style={styles.sectionTitle}>Weitere Turniere</h3>
                {tournaments
                  .filter((t) => t.id !== activeTournament.id)
                  .map((t) => (
                    <Link
                      key={t.id}
                      to={`/tournament/${t.id}`}
                      className="pe-card-interactive"
                      style={styles.otherTournamentCard}
                    >
                      <div>
                        <span style={styles.otherName}>{t.name}</span>
                        <span style={styles.otherMeta}>
                          {t.date} &middot; {t.format}
                        </span>
                      </div>
                      <span
                        style={{
                          ...styles.statusBadgeSmall,
                          color: statusColors[t.status],
                          borderColor: statusColors[t.status],
                        }}
                      >
                        {statusLabels[t.status]}
                      </span>
                    </Link>
                  ))}
              </div>
            )}

            {/* NEU: Turnier-Archiv Link */}
            <div style={{ marginTop: 24 }}>
              <h3 style={styles.sectionTitle}>Archiv</h3>
              <Link
                to="/history"
                className="pe-card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  borderRadius: 12,
                  background: 'var(--pe-bg-card)',
                  border: '1px solid var(--pe-border)',
                  textDecoration: 'none',
                  minHeight: 64,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>📜</span>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--pe-text)', display: 'block' }}>
                      Turnier-Archiv
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--pe-text-sub)' }}>
                      Vergangene Turniere &amp; Statistiken
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--pe-text-muted)' }}>›</span>
              </Link>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

// NEU: Bracket nachladen falls nicht in Tournament-Detail
function FetchBracket({ tournamentId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tournaments/${tournamentId}`)
      .then((data) => setGames(data.games || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <p style={{ color: 'var(--pe-text-sub)', textAlign: 'center' }}>Lade Bracket...</p>;
  if (games.length === 0) return <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center' }}>Noch keine Spiele erstellt.</p>;
  return <Bracket games={games} />;
}

// NEU: Styles
const styles = {
  header: {
    background: 'var(--pe-gradient)',
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    height: 56,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
    margin: 0,
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    lineHeight: 1.2,
  },
  content: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '16px 12px 100px',
  },
  tournamentCard: {
    background: 'var(--pe-bg-card)',
    borderRadius: 16,
    border: '1px solid var(--pe-border)',
    padding: 16,
    marginBottom: 16,
  },
  tournamentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
    margin: 0,
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },
  tournamentMeta: {
    fontSize: 12,
    color: 'var(--pe-text-sub)',
    margin: '4px 0 0',
    lineHeight: 1.5,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    padding: '4px 10px',
    borderRadius: 20,
    borderWidth: '1px',
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
  },
  statusBadgeSmall: {
    fontSize: 10,
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: 16,
    borderWidth: '1px',
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
  },
  tournamentStats: {
    marginTop: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'var(--pe-cyan-bright)',
  },
  statLabel: {
    fontSize: 11,
    color: 'var(--pe-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  joinButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    borderRadius: 12,
    background: 'var(--pe-blue-deep)',
    color: 'var(--pe-text)',
    fontFamily: 'Verdana, Geneva, sans-serif',
    fontSize: 14,
    fontWeight: 'bold',
    textDecoration: 'none',
    minHeight: 64,
  },
  tabBar: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  tabButton: {
    padding: '0 18px',
    borderRadius: 10,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--pe-border)',
    background: 'var(--pe-bg-card)',
    color: 'var(--pe-text-sub)',
    fontFamily: 'Verdana, Geneva, sans-serif',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    minHeight: 64,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabButtonActive: {
    background: 'var(--pe-blue-deep)',
    color: 'var(--pe-text)',
    borderColor: 'var(--pe-blue-deep)',
  },
  playerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 8,
  },
  playerCard: {
    background: 'var(--pe-bg-card)',
    borderRadius: 12,
    border: '1px solid var(--pe-border)',
    padding: 14,
  },
  playerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
    marginBottom: 8,
  },
  playerStatsRow: {
    display: 'flex',
    gap: 12,
  },
  playerStat: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  playerStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'var(--pe-cyan-bright)',
  },
  playerStatLabel: {
    fontSize: 10,
    color: 'var(--pe-text-muted)',
    textTransform: 'uppercase',
  },
  boardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  boardCard: {
    display: 'block',
    background: 'var(--pe-bg-card)',
    borderRadius: 12,
    border: '1px solid var(--pe-border)',
    padding: 14,
    textDecoration: 'none',
  },
  boardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  boardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
  },
  boardName: {
    fontSize: 13,
    color: 'var(--pe-text-sub)',
  },
  boardGame: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  boardGameLabel: {
    fontSize: 12,
    color: 'var(--pe-success)',
    fontWeight: 'bold',
    minWidth: 55,
  },
  boardNextLabel: {
    fontSize: 12,
    color: 'var(--pe-text-muted)',
    fontWeight: 'bold',
    minWidth: 55,
  },
  boardGamePlayers: {
    fontSize: 14,
    color: 'var(--pe-text)',
    fontWeight: 'bold',
  },
  groupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  groupCard: {
    background: 'var(--pe-bg-card)',
    borderRadius: 12,
    border: '1px solid var(--pe-border)',
    padding: 14,
  },
  groupName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
    margin: '0 0 10px',
  },
  groupTable: {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
  },
  groupTh: {
    fontSize: 11,
    color: 'var(--pe-text-muted)',
    textTransform: 'uppercase',
    textAlign: 'left',
    padding: '4px 8px',
    borderBottom: '1px solid var(--pe-border)',
  },
  groupTd: {
    fontSize: 13,
    color: 'var(--pe-text)',
    padding: '6px 8px',
    borderBottom: '1px solid var(--pe-border)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  otherTournaments: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'var(--pe-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    margin: '0 0 10px',
  },
  otherTournamentCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: 10,
    background: 'var(--pe-bg-card)',
    border: '1px solid var(--pe-border)',
    textDecoration: 'none',
    marginBottom: 8,
  },
  otherName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'var(--pe-text)',
    display: 'block',
  },
  otherMeta: {
    fontSize: 12,
    color: 'var(--pe-text-sub)',
  },
  fab: {
    position: 'fixed',
    bottom: 20,
    right: 16,
    display: 'flex',
    gap: 10,
    zIndex: 50,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    textDecoration: 'none',
    background: 'var(--pe-bg-elevated)',
    border: '1px solid var(--pe-border)',
    color: 'var(--pe-text-sub)',
    fontFamily: 'Verdana, Geneva, sans-serif',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
};
