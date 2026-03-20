import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useStore } from '../store';
import { parseJwt, isTokenValid } from '../lib/parseJwt';
import { api } from '../api/client';
import { useToastStore } from '../store/toasts';
import TournamentManager from '../components/admin/TournamentManager';
import WalkonBadge from '../components/WalkonBadge';
import {
  LayoutDashboard, Flag, Trophy, Users, Target,
  UserCog, UtensilsCrossed, Mail, Settings, ScrollText, HelpCircle,
  Play, Square, Loader2, Search, X, Trash2,
} from 'lucide-react';

const ALL_TABS = [
  { id: 'overview',    label: 'Übersicht',     Icon: LayoutDashboard, color: 'var(--pe-cyan-bright)', roles: ['admin', 'director'] },
  { id: 'director',    label: 'Turnierleiter', Icon: Flag,            color: 'var(--pe-blue-mid)',    roles: ['admin', 'director'] },
  { id: 'tournaments', label: 'Turniere',      Icon: Trophy,          color: 'var(--pe-cyan-light)',  roles: ['admin', 'director'] },
  { id: 'players',     label: 'Spieler',       Icon: Users,           color: 'var(--pe-success)',     roles: ['admin', 'director'] },
  { id: 'boards',      label: 'Boards',        Icon: Target,          color: 'var(--pe-blue-deep)',   roles: ['admin', 'director'] },
  { id: 'users',       label: 'User',          Icon: UserCog,         color: 'var(--pe-warning)',     roles: ['admin'] },
  { id: 'gastro',      label: 'Gastro',        Icon: UtensilsCrossed, color: 'var(--pe-success)',     roles: ['admin'] },
  { id: 'mailing',     label: 'Mailing',       Icon: Mail,            color: 'var(--pe-cyan-bright)', roles: ['admin'] },
  { id: 'settings',    label: 'Einstellungen', Icon: Settings,        color: 'var(--pe-text-sub)',    roles: ['admin'] },
  { id: 'log',         label: 'System-Log',    Icon: ScrollText,      color: 'var(--pe-text-muted)',  roles: ['admin', 'director'] },
  { id: 'help',        label: 'Hilfe',         Icon: HelpCircle,      color: 'var(--pe-text-sub)',    roles: ['admin', 'director'] },
];

// NEU: Rollen-Farben
const ROLE_COLORS = {
  admin:      'var(--pe-danger)',
  director:   'var(--pe-blue-mid)',
  referee:    'var(--pe-warning)',
  gastronomy: 'var(--pe-success)',
};

// NEU: Gemeinsamer Input-Style
const inputStyle = {
  background: 'var(--pe-bg-card)',
  border: '1px solid var(--pe-border)',
  color: 'var(--pe-text)',
  minHeight: '52px',
  fontFamily: 'var(--pe-font-body)',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235A7394' d='M6 8L1 3h10z'/%3E%3C%2Fsvg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '30px',
  cursor: 'pointer',
};

const btnSmall = {
  fontFamily: 'var(--pe-font-body)',
  borderRadius: 'var(--pe-radius-sm)',
  fontWeight: 'bold',
  border: '1px solid var(--pe-border)',
  cursor: 'pointer',
  fontSize: '14px',
};

// NEU: Tab "Übersicht" — Alle laufenden Spiele, Boards-Status
function OverviewTab() {
  const [boards, setBoards] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTournament, setActiveTournament] = useState(null);

  useEffect(() => {
    api.get('/tournaments/active').catch(() => null)
      .then(t => {
        if (t) {
          setActiveTournament(t);
          return Promise.all([
            api.get(`/boards?tournament_id=${t.id}`).catch(() => []),
            api.get('/games?status=active').catch(() => []),
          ]).then(([b, g]) => { setBoards(b); setGames(Array.isArray(g) ? g : []); });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--pe-text-sub)' }}>Lade...</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Übersicht{activeTournament ? ` — ${activeTournament.name}` : ''}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
          <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Aktive Spiele</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--pe-success)' }}>{games.length}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
          <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Boards</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--pe-cyan-bright)' }}>{boards.length}</p>
        </div>
      </div>
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--pe-text-sub)' }}>LAUFENDE SPIELE</h3>
      <div className="space-y-2">
        {games.length === 0 && <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Keine laufenden Spiele</p>}
        {games.map((g) => (
          <div key={g.id} className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
            <span style={{ color: 'var(--pe-text)' }}>{g.player1_name || 'TBD'} vs {g.player2_name || 'TBD'}</span>
            <span className="text-xs" style={{ color: 'var(--pe-text-muted)' }}>Runde {g.round}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// NEU: Tab "Boards" — Scheiben verwalten (tournament-specific)
function BoardsTab() {
  const { addToast } = useToastStore();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [boards, setBoards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '' });

  // Load tournaments on mount, default to active or first
  useEffect(() => {
    api.get('/tournaments').then((ts) => {
      setTournaments(ts);
      const active = ts.find(t => t.status === 'active');
      const defaultT = active || ts[0];
      if (defaultT) setSelectedTournamentId(String(defaultT.id));
    }).catch(() => {});
  }, []);

  const loadBoards = () => {
    if (!selectedTournamentId) { setBoards([]); return; }
    api.get(`/boards?tournament_id=${selectedTournamentId}`).then(setBoards).catch(() => {});
  };

  useEffect(() => { loadBoards(); }, [selectedTournamentId]);

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedTournamentId) return;
    const nextNumber = boards.length + 1;
    try {
      await api.post('/boards', { number: nextNumber, name: form.name, tournament_id: parseInt(selectedTournamentId, 10) });
      setForm({ name: '' });
      setShowForm(false);
      loadBoards();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' });
    }
  };

  const selectedTournament = tournaments.find(t => String(t.id) === selectedTournamentId);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Boards</h2>
        <button onClick={() => setShowForm(!showForm)} disabled={!selectedTournamentId} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)' }}>
          {showForm ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {/* Tournament selector */}
      <select
        value={selectedTournamentId}
        onChange={(e) => setSelectedTournamentId(e.target.value)}
        className="w-full p-3 rounded-lg outline-none mb-4"
        style={selectStyle}
      >
        <option value="">-- Turnier auswählen --</option>
        {tournaments.map(t => (
          <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
        ))}
      </select>

      {selectedTournament && (
        <p className="text-sm mb-4" style={{ color: 'var(--pe-text-sub)' }}>
          Boards für: <strong style={{ color: 'var(--pe-text)' }}>{selectedTournament.name}</strong>
          {' '}— {boards.length} Board{boards.length !== 1 ? 's' : ''} vorhanden
        </p>
      )}

      {showForm && selectedTournamentId && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl mb-6 space-y-3" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
          <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>
            Wird als Board {boards.length + 1} für &ldquo;{selectedTournament?.name}&rdquo; angelegt
          </p>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (optional)" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <button type="submit" className="w-full py-3 rounded-lg font-bold disabled:opacity-50" style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '48px', fontFamily: 'var(--pe-font-body)' }}>
            Board erstellen
          </button>
        </form>
      )}

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {boards.map((b) => {
            const isFinalDisabled = !b.is_final && boards.some(x => x.is_final && x.id !== b.id);
            return (
              <div key={b.id} style={{ background: 'var(--pe-bg-card)', border: b.is_final ? '1px solid var(--pe-warning)' : '1px solid var(--pe-border)', borderRadius: 'var(--pe-radius-md)', padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '22px' }}>🎯</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--pe-text)' }}>Board {b.number}</div>
                {b.name && <div style={{ fontSize: '10px', color: 'var(--pe-text-muted)' }}>{b.name}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: 'var(--pe-radius-sm)', background: b.current_game_id ? 'rgba(0,229,160,0.15)' : 'rgba(90,115,148,0.15)', color: b.current_game_id ? 'var(--pe-success)' : 'var(--pe-text-muted)', border: b.current_game_id ? '1px solid rgba(0,229,160,0.3)' : '1px solid var(--pe-border)' }}>
                    {b.current_game_id ? '● Aktiv' : 'Frei'}
                  </span>
                  {!!b.is_final && (
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: 'var(--pe-radius-sm)', background: 'rgba(255,176,32,0.15)', color: 'var(--pe-warning)', border: '1px solid rgba(255,176,32,0.3)' }}>★ Final</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                  <button
                    disabled={isFinalDisabled}
                    title={isFinalDisabled ? 'Es kann nur ein Final-Board geben' : ''}
                    onClick={async () => {
                      try {
                        await api.put(`/boards/${b.id}/final`, { is_final: !b.is_final });
                        loadBoards();
                      } catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                    }}
                    style={{ ...btnSmall, flex: 1, padding: '4px 6px', border: 'none', fontSize: '10px', cursor: isFinalDisabled ? 'not-allowed' : 'pointer', background: b.is_final ? 'var(--pe-warning)' : 'var(--pe-bg-elevated)', color: b.is_final ? '#000' : 'var(--pe-text-sub)', opacity: isFinalDisabled ? 0.4 : 1 }}
                  >
                    {b.is_final ? '★ Final' : 'Als Final markieren'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Board ${b.number} löschen?`)) return;
                      try { await api.del(`/boards/${b.id}`); loadBoards(); }
                      catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                    }}
                    style={{ ...btnSmall, padding: '4px 8px', border: 'none', fontSize: '10px', color: 'var(--pe-danger)' }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
          {boards.length === 0 && selectedTournamentId && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '13px', padding: '24px' }}>Keine Boards für dieses Turnier.</p>
          )}
          {!selectedTournamentId && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '13px', padding: '24px' }}>Keine Turniere vorhanden.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map((b) => (
            <div key={b.id} className="p-4 rounded-xl" style={{ background: 'var(--pe-bg-card)', border: `1px solid ${b.is_final ? 'var(--pe-warning)' : 'var(--pe-border)'}` }}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="font-bold" style={{ color: 'var(--pe-text)' }}>Board {b.number}</span>
                  {b.name && <span className="ml-2 text-sm" style={{ color: 'var(--pe-text-sub)' }}>({b.name})</span>}
                  {b.is_final ? <span className="ml-2 text-xs font-bold" style={{ color: 'var(--pe-warning)' }}>★ FINAL</span> : null}
                </div>
                <span className="text-xs" style={{ color: b.current_game_id ? 'var(--pe-success)' : 'var(--pe-text-muted)' }}>
                  {b.current_game_id ? 'Aktiv' : 'Frei'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!b.is_final && boards.some(x => x.is_final && x.id !== b.id)}
                  onClick={async () => {
                    try {
                      await api.put(`/boards/${b.id}/final`, { is_final: !b.is_final });
                      loadBoards();
                    } catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                  }}
                  title={!b.is_final && boards.some(x => x.is_final && x.id !== b.id) ? 'Es kann nur ein Final-Board geben' : ''}
                  style={{ ...btnSmall, padding: '4px 12px', background: b.is_final ? 'var(--pe-warning)' : 'var(--pe-bg-elevated)', color: b.is_final ? '#000' : 'var(--pe-text-sub)', minHeight: '36px', flex: 1, opacity: (!b.is_final && boards.some(x => x.is_final && x.id !== b.id)) ? 0.4 : 1, cursor: (!b.is_final && boards.some(x => x.is_final && x.id !== b.id)) ? 'not-allowed' : 'pointer' }}
                >
                  {b.is_final ? '★ Final' : 'Als Final markieren'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Board ${b.number} löschen?`)) return;
                    try { await api.del(`/boards/${b.id}`); loadBoards(); }
                    catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                  }}
                  style={{ ...btnSmall, padding: '4px 12px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', minHeight: '36px' }}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// NEU: Tab "Spieler" — Anlegen, Walk-On Song, Statistiken

function PlayersTab() {
  const { addToast } = useToastStore();
  const [players, setPlayers] = useState([]);
  const [walkonStatuses, setWalkonStatuses] = useState({}); // { [playerId]: status string }
  const [playingId, setPlayingId] = useState(null); // id of player whose walk-on is currently playing
  const audioRef = useRef(null);
  const [addMode, setAddMode] = useState(null); // null | 'new'

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const [form, setForm] = useState({ vorname: '', nickname: '', nachname: '', walk_on_song: '', walkon_start: 0, walkon_duration: 30 });
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => { setEditingPlayer(null); }, [isDesktop]);

  // Poll every 3s for players whose walk-on is still downloading
  useEffect(() => {
    const downloading = Object.entries(walkonStatuses)
      .filter(([, s]) => s === 'pending' || s === 'downloading')
      .map(([id]) => Number(id));
    if (downloading.length === 0) return;
    const interval = setInterval(async () => {
      const updates = {};
      await Promise.all(downloading.map(async (id) => {
        try {
          const s = await api.get(`/walkon/${id}/status`);
          const status = s.job?.status;
          updates[id] = status;
          if (status === 'ready') {
            // Badge transitions to ready state automatically; close editing panel
            setEditingPlayer(prev => prev?.id === id ? null : prev);
          } else if (status === 'error') {
            // Badge transitions to error state automatically; close editing panel
            setEditingPlayer(prev => prev?.id === id ? null : prev);
          }
        } catch { updates[id] = null; }
      }));
      setWalkonStatuses(prev => ({ ...prev, ...updates }));
    }, 3000);
    return () => clearInterval(interval);
  }, [walkonStatuses]);

  // Walk-On inline play/stop handler
  const handleWalkonPlay = async (player) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    // If same player — toggle off
    if (playingId === player.id) {
      setPlayingId(null);
      return;
    }
    // Start new playback
    const audio = new Audio(`/api/walkon/${player.id}/audio`);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    try {
      await audio.play();
      setPlayingId(player.id);
    } catch {
      audioRef.current = null;
      setPlayingId(null);
    }
  };

  const loadPlayers = useCallback(async () => {
    try {
      const data = await api.get('/players');
      setPlayers(data);
      const statuses = {};
      data.forEach(p => { if (p.walkon_status) statuses[p.id] = p.walkon_status; });
      setWalkonStatuses(statuses);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.vorname.trim() || !form.nickname.trim() || !form.nachname.trim()) return;
    try {
      const res = await api.post('/players', form);
      const newPlayerId = res.id || res.player_id || res.player?.id;
      if (form.walk_on_song && newPlayerId) {
        try {
          await api.post(`/walkon/${newPlayerId}`, {
            url: form.walk_on_song,
            start: Number(form.walkon_start) || 0,
            duration: Number(form.walkon_duration) || 30,
          });
        } catch (err) {
          console.warn('Walk-On Job konnte nicht gestartet werden:', err.message);
        }
      }
      setForm({ vorname: '', nickname: '', nachname: '', walk_on_song: '', walkon_start: 0, walkon_duration: 30 });
      setAddMode(null);
      await loadPlayers();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Spieler konnte nicht angelegt werden' });
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingPlayer) return;
    setIsSaving(true);
    try {
      await api.put(`/players/${editingPlayer.id}`, editingPlayer);
      if (editingPlayer.walk_on_song) {
        try {
          await api.post(`/walkon/${editingPlayer.id}`, {
            url: editingPlayer.walk_on_song,
            start: Number(editingPlayer.walkon_start) || 0,
            duration: Number(editingPlayer.walkon_duration) || 30,
          });
          // Mark as pending immediately — badge updates reactively, polling effect takes over
          setWalkonStatuses(prev => ({ ...prev, [editingPlayer.id]: 'pending' }));
          // Keep card open so user sees the badge progress indicator
        } catch (err) {
          addToast({ type: 'error', message: 'Walk-On konnte nicht gestartet werden: ' + (err.message || '') });
          setEditingPlayer(null);
        }
      } else {
        try {
          await api.del(`/walkon/${editingPlayer.id}`);
        } catch { /* ignore if no walkon exists */ }
        addToast({ type: 'success', message: 'Spieler gespeichert' });
        setEditingPlayer(null);
      }
      await loadPlayers();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Spieler konnte nicht gespeichert werden' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPlayers = players.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (p.vorname || '').toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.nachname || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Spieler</h2>
        <button
          onClick={() => { setAddMode(addMode ? null : 'new'); }}
          className="px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)' }}
        >
          {addMode ? 'Abbrechen' : '+ Spieler'}
        </button>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <span style={{
          position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--pe-text-muted)', pointerEvents: 'none',
          display: 'flex', alignItems: 'center',
        }}>
          <Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Spieler suchen…"
          style={{
            ...inputStyle,
            width: '100%',
            paddingLeft: '44px',
            paddingRight: searchQuery ? '40px' : '16px',
            minHeight: '52px',
            boxSizing: 'border-box',
            borderRadius: 'var(--pe-radius-md, 12px)',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--pe-text-muted)', padding: '4px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Result count */}
      {searchQuery && (
        <p style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginBottom: '8px' }}>
          {filteredPlayers.length} von {players.length} Spielern
        </p>
      )}

      {addMode === 'new' && (
        <div className="p-4 rounded-xl mb-6" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
          <form onSubmit={handleCreate} className="space-y-3">
            <input type="text" value={form.vorname} onChange={(e) => setForm({ ...form, vorname: e.target.value })} placeholder="Vorname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              placeholder="Nickname *"
              required
              className="w-full p-3 rounded-lg outline-none"
              style={inputStyle}
            />
            <input type="text" value={form.nachname} onChange={(e) => setForm({ ...form, nachname: e.target.value })} placeholder="Nachname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
            <input type="url" value={form.walk_on_song} onChange={(e) => setForm({ ...form, walk_on_song: e.target.value })} placeholder="Walk-On Song URL (optional)" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
            {form.walk_on_song && (
              <div className="flex gap-2">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '4px' }}>Startzeit (Sek.)</label>
                  <input type="number" min="0" value={form.walkon_start} onChange={(e) => setForm({ ...form, walkon_start: e.target.value })} required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '4px' }}>Länge (Sek.)</label>
                  <input type="number" min="5" max="120" value={form.walkon_duration} onChange={(e) => setForm({ ...form, walkon_duration: e.target.value })} required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                </div>
              </div>
            )}
            {form.vorname && form.nickname && form.nachname && (
              <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)' }}>
                Angezeigt als: <strong style={{ color: 'var(--pe-text)' }}>{form.vorname.trim()} &ldquo;{form.nickname.trim()}&rdquo; {form.nachname.trim()}</strong>
              </p>
            )}
            <button type="submit" disabled={!form.vorname.trim() || !form.nickname.trim() || !form.nachname.trim()} className="w-full py-3 rounded-lg font-bold disabled:opacity-50" style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '48px', fontFamily: 'var(--pe-font-body)' }}>
              Spielerprofil anlegen
            </button>
          </form>
        </div>
      )}

      {editingPlayer && !isDesktop && (
        <form onSubmit={handleEdit} className="p-4 rounded-xl mb-4 space-y-3" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-cyan-bright)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--pe-cyan-bright)' }}>Spieler bearbeiten</p>
          <input type="text" value={editingPlayer.vorname} onChange={(e) => setEditingPlayer({ ...editingPlayer, vorname: e.target.value })} placeholder="Vorname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <input type="text" value={editingPlayer.nickname} onChange={(e) => setEditingPlayer({ ...editingPlayer, nickname: e.target.value })} placeholder="Nickname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <input type="text" value={editingPlayer.nachname} onChange={(e) => setEditingPlayer({ ...editingPlayer, nachname: e.target.value })} placeholder="Nachname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <input type="url" value={editingPlayer.walk_on_song || ''} onChange={(e) => setEditingPlayer({ ...editingPlayer, walk_on_song: e.target.value })} placeholder="Walk-On Song URL (optional)" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          {editingPlayer.walk_on_song && (
            <div className="flex gap-2">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '4px' }}>Startzeit (Sek.)</label>
                <input
                  type="number" min="0" value={editingPlayer.walkon_start ?? 0}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, walkon_start: e.target.value })}
                  required className="w-full p-3 rounded-lg outline-none" style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '4px' }}>Länge (Sek.)</label>
                <input
                  type="number" min="5" max="120" value={editingPlayer.walkon_duration ?? 30}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, walkon_duration: e.target.value })}
                  required className="w-full p-3 rounded-lg outline-none" style={inputStyle}
                />
              </div>
            </div>
          )}
          {editingPlayer.vorname && editingPlayer.nickname && editingPlayer.nachname && (
            <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)' }}>
              Angezeigt als: <strong style={{ color: 'var(--pe-text)' }}>{editingPlayer.vorname.trim()} &ldquo;{editingPlayer.nickname.trim()}&rdquo; {editingPlayer.nachname.trim()}</strong>
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="flex-1 py-2 rounded-lg font-bold" style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>{isSaving ? 'Speichert…' : 'Speichern'}</button>
            <button type="button" onClick={() => setEditingPlayer(null)} className="px-4 py-2 rounded-lg" style={{ background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', fontFamily: 'var(--pe-font-body)' }}>Abbrechen</button>
          </div>
        </form>
      )}

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {filteredPlayers.map((p) => {
            const isExpanded = editingPlayer?.id === p.id;
            const effectiveWalkonStatus = walkonStatuses[p.id] ?? p.walkon_status ?? (p.has_walkon ? 'ready' : null);
            return (
              <div key={p.id} style={{ background: 'var(--pe-bg-card)', border: `1px solid ${isExpanded || playingId === p.id ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`, borderRadius: 'var(--pe-radius-md)', padding: '12px', boxShadow: playingId === p.id ? '0 0 8px var(--pe-cyan-bright)' : 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minWidth: 0, overflow: 'hidden' }}>
                {/* Collapsed header — always visible */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Avatar circle — initials */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', color: 'var(--pe-cyan-bright)', letterSpacing: '0.5px' }}>
                    {`${(p.vorname || '')[0] || ''}${(p.nachname || '')[0] || ''}`.toUpperCase() || '?'}
                  </div>
                  {/* Name + badges */}
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--pe-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                      {p.active_tournament_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(26,79,214,0.15)', border: '1px solid rgba(26,79,214,0.4)', borderRadius: '6px', padding: '1px 6px', fontSize: '10px', color: 'var(--pe-cyan-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          🏆 {p.active_tournament_name}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'transparent', border: '1px solid var(--pe-border)', borderRadius: '6px', padding: '1px 6px', fontSize: '10px', color: 'var(--pe-text-muted)' }}>
                          kein Turnier
                        </span>
                      )}
                      {(p.has_walkon || p.walkon_youtube) && (
                        <WalkonBadge
                          status={effectiveWalkonStatus}
                          title={p.walkon_title}
                          artist={p.walkon_artist}
                        />
                      )}
                    </div>
                  </div>
                  {/* Walk-On Play/Stop button — only when ready */}
                  {effectiveWalkonStatus === 'ready' && (
                    <button
                      onClick={() => handleWalkonPlay(p)}
                      title={playingId === p.id ? 'Walk-On stoppen' : 'Walk-On abspielen'}
                      style={{
                        ...btnSmall,
                        width: '36px',
                        height: '36px',
                        minHeight: '36px',
                        padding: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: playingId === p.id ? '1px solid var(--pe-cyan-bright)' : '1px solid var(--pe-border)',
                        background: playingId === p.id ? 'rgba(0,184,255,0.15)' : 'var(--pe-bg-elevated)',
                        color: playingId === p.id ? 'var(--pe-cyan-bright)' : 'var(--pe-success)',
                        borderRadius: 'var(--pe-radius-sm)',
                        cursor: 'pointer',
                        boxShadow: playingId === p.id ? '0 0 8px var(--pe-cyan-bright)' : 'none',
                        transition: 'box-shadow 0.2s, background 0.2s',
                      }}
                    >
                      {playingId === p.id
                        ? <Square size={14} strokeWidth={2.5} />
                        : <Play size={14} strokeWidth={2.5} />
                      }
                    </button>
                  )}
                  {/* Edit / Close button */}
                  <button
                    onClick={() => isExpanded
                      ? setEditingPlayer(null)
                      : setEditingPlayer({ id: p.id, vorname: p.vorname || '', nickname: p.nickname || '', nachname: p.nachname || '', walk_on_song: p.walkon_url || p.walkon_youtube || '', walkon_start: p.walkon_start ?? 0, walkon_duration: p.walkon_duration ?? 30 })
                    }
                    style={{ ...btnSmall, fontSize: '11px', padding: '4px 8px', minHeight: '36px', border: isExpanded ? '1px solid var(--pe-cyan-bright)' : '1px solid var(--pe-border)', background: isExpanded ? 'rgba(0,184,255,0.1)' : 'var(--pe-bg-elevated)', color: isExpanded ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)', flexShrink: 0 }}
                  >
                    {isExpanded ? '✕' : '✏️'}
                  </button>
                </div>
                {/* Expanded accordion form */}
                {isExpanded && (
                  <form onSubmit={handleEdit} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px', animation: 'pe-slide-down 0.18s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      <input type="text" value={editingPlayer.vorname} onChange={e => setEditingPlayer({ ...editingPlayer, vorname: e.target.value })} placeholder="Vorname *" required style={{ ...inputStyle, padding: '6px 8px' }} />
                      <input type="text" value={editingPlayer.nachname} onChange={e => setEditingPlayer({ ...editingPlayer, nachname: e.target.value })} placeholder="Nachname *" required style={{ ...inputStyle, padding: '6px 8px' }} />
                    </div>
                    <input type="text" value={editingPlayer.nickname} onChange={e => setEditingPlayer({ ...editingPlayer, nickname: e.target.value })} placeholder="Nickname *" required style={{ ...inputStyle, padding: '6px 8px' }} />
                    <input type="url" value={editingPlayer.walk_on_song || ''} onChange={e => setEditingPlayer({ ...editingPlayer, walk_on_song: e.target.value })} placeholder="Walk-On URL (optional)" style={{ ...inputStyle, padding: '6px 8px' }} />
                    {editingPlayer.walk_on_song && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                        <input type="number" min="0" value={editingPlayer.walkon_start ?? 0} onChange={e => setEditingPlayer({ ...editingPlayer, walkon_start: e.target.value })} placeholder="Start (Sek.)" required style={{ ...inputStyle, padding: '6px 8px' }} />
                        <input type="number" min="5" max="120" value={editingPlayer.walkon_duration ?? 30} onChange={e => setEditingPlayer({ ...editingPlayer, walkon_duration: e.target.value })} placeholder="Länge (Sek.)" required style={{ ...inputStyle, padding: '6px 8px' }} />
                      </div>
                    )}
                    {!p.active_tournament_id && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`${p.name} löschen?`)) return;
                          try { await api.del(`/players/${p.id}`); await loadPlayers(); }
                          catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                        }}
                        style={{ ...btnSmall, padding: '6px', fontSize: '10px', cursor: 'pointer', color: 'var(--pe-danger)' }}
                      >
                        Löschen
                      </button>
                    )}
                      <button type="submit" disabled={isSaving} style={{ ...btnSmall, background: 'var(--pe-gradient)', color: 'var(--pe-text)', borderRadius: '6px', padding: '8px', fontSize: '10px', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        {isSaving ? 'Speichert…' : 'Speichern'}
                      </button>
                  </form>
                )}
              </div>
            );
          })}
          {filteredPlayers.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '13px', padding: '24px' }}>
              {searchQuery ? `Kein Spieler gefunden für «${searchQuery}»` : 'Keine Spieler'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((p) => (
            <div key={p.id} className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--pe-bg-card)', border: `1px solid ${playingId === p.id ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`, boxShadow: playingId === p.id ? '0 0 8px var(--pe-cyan-bright)' : 'none', transition: 'box-shadow 0.2s, border-color 0.2s' }}>
              <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                <span className="font-bold" style={{ color: 'var(--pe-text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                  {p.active_tournament_name ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(26,79,214,0.15)', border: '1px solid rgba(26,79,214,0.4)', borderRadius: '6px', padding: '1px 6px', fontSize: '10px', color: 'var(--pe-cyan-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      🏆 {p.active_tournament_name}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'transparent', border: '1px solid var(--pe-border)', borderRadius: '6px', padding: '1px 6px', fontSize: '10px', color: 'var(--pe-text-muted)' }}>
                      kein Turnier
                    </span>
                  )}
                  {(p.has_walkon || p.walkon_youtube) && (
                    <WalkonBadge
                      status={walkonStatuses[p.id] ?? p.walkon_status ?? (p.has_walkon ? 'ready' : null)}
                      title={p.walkon_title}
                      artist={p.walkon_artist}
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {/* Walk-On Play/Stop button — only when ready */}
                {(walkonStatuses[p.id] ?? p.walkon_status ?? (p.has_walkon ? 'ready' : null)) === 'ready' && (
                  <button
                    onClick={() => handleWalkonPlay(p)}
                    title={playingId === p.id ? 'Walk-On stoppen' : 'Walk-On abspielen'}
                    style={{
                      ...btnSmall,
                      width: '64px',
                      height: '64px',
                      minHeight: '64px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: playingId === p.id ? '1px solid var(--pe-cyan-bright)' : '1px solid var(--pe-border)',
                      background: playingId === p.id ? 'rgba(0,184,255,0.15)' : 'var(--pe-bg-elevated)',
                      color: playingId === p.id ? 'var(--pe-cyan-bright)' : 'var(--pe-success)',
                      borderRadius: 'var(--pe-radius-md)',
                      cursor: 'pointer',
                      boxShadow: playingId === p.id ? '0 0 8px var(--pe-cyan-bright)' : 'none',
                      transition: 'box-shadow 0.2s, background 0.2s',
                    }}
                  >
                    {playingId === p.id
                      ? <Square size={22} strokeWidth={2.5} />
                      : <Play size={22} strokeWidth={2.5} />
                    }
                  </button>
                )}
                <button
                  onClick={() => setEditingPlayer({
                    id: p.id,
                    vorname: p.vorname || '',
                    nickname: p.nickname || '',
                    nachname: p.nachname || '',
                    walk_on_song: p.walkon_url || p.walkon_youtube || '',
                    walkon_start: p.walkon_start ?? 0,
                    walkon_duration: p.walkon_duration ?? 30,
                  })}
                  style={{ ...btnSmall, padding: '4px 12px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-cyan-bright)', minHeight: '36px' }}
                >
                  Bearbeiten
                </button>
                {!p.active_tournament_id && (
                  <button
                    onClick={async () => {
                      if (!confirm(`${p.name} löschen?`)) return;
                      try { await api.del(`/players/${p.id}`); await loadPlayers(); }
                      catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                    }}
                    style={{ ...btnSmall, padding: '4px 12px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', minHeight: '36px', cursor: 'pointer' }}
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredPlayers.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>
              {searchQuery ? `Kein Spieler gefunden für «${searchQuery}»` : 'Keine Spieler'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// NEU: Tab "User" — Mitarbeiter-Verwaltung
const ROLE_LABELS = { admin: 'Admin', director: 'Turnierleitung', referee: 'Schiedsrichter', gastronomy: 'Gastronomie' };

function UsersTab() {
  const { addToast } = useToastStore();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'director', email: '', vorname: '', nickname: '', nachname: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const loadUsers = () => { api.get('/users').then(setUsers).catch(() => {}); };
  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.username.trim() || !createForm.password || !createForm.vorname.trim() || !createForm.nickname.trim() || !createForm.nachname.trim()) return;
    try {
      await api.post('/users', createForm);
      setCreateForm({ username: '', password: '', role: 'director', email: '', vorname: '', nickname: '', nachname: '' });
      setShowCreate(false);
      loadUsers();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen' }); }
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setEditForm({ role: u.role, password: '', email: u.email || '', vorname: u.vorname || '', nickname: u.nickname || '', nachname: u.nachname || '' });
  };

  const handleSaveEdit = async (userId) => {
    const payload = { role: editForm.role, email: editForm.email, vorname: editForm.vorname, nickname: editForm.nickname, nachname: editForm.nachname };
    if (editForm.password) payload.password = editForm.password;
    try {
      await api.put(`/users/${userId}`, payload);
      setEditId(null);
      loadUsers();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Speichern fehlgeschlagen' }); }
  };

  const handleDelete = async (userId) => {
    if (!confirm('User wirklich deaktivieren?')) return;
    try { await api.del(`/users/${userId}`); loadUsers(); }
    catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen' }); }
  };

  const handleReactivate = async (userId) => {
    try { await api.put(`/users/${userId}/reactivate`, {}); loadUsers(); }
    catch (err) { addToast({ type: 'error', message: err.message || 'Reaktivierung fehlgeschlagen' }); }
  };

  const canSubmit = createForm.username.trim() && createForm.password && createForm.vorname.trim() && createForm.nickname.trim() && createForm.nachname.trim();

  const ROLE_BADGE_STYLES = {
    admin:      { color: 'var(--pe-danger)',   bg: 'rgba(255,69,96,0.15)',   border: 'rgba(255,69,96,0.3)' },
    director:   { color: 'var(--pe-blue-mid)', bg: 'rgba(30,127,235,0.15)',  border: 'rgba(30,127,235,0.3)' },
    referee:    { color: 'var(--pe-warning)',   bg: 'rgba(255,176,32,0.15)',  border: 'rgba(255,176,32,0.3)' },
    gastronomy: { color: 'var(--pe-success)',   bg: 'rgba(0,229,160,0.15)',   border: 'rgba(0,229,160,0.3)' },
  };

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  useEffect(() => { setEditId(null); }, [isDesktop]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>User</h2>
        <button onClick={() => { setShowCreate(!showCreate); setEditId(null); }} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)' }}>
          {showCreate ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl mb-6 space-y-3" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Neuer User</p>
          {/* Name — wie bei Spielern */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <input type="text" value={createForm.vorname} onChange={e => setCreateForm({ ...createForm, vorname: e.target.value })} placeholder="Vorname *" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
            <input type="text" value={createForm.nickname} onChange={e => setCreateForm({ ...createForm, nickname: e.target.value })} placeholder='Nickname *' className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
            <input type="text" value={createForm.nachname} onChange={e => setCreateForm({ ...createForm, nachname: e.target.value })} placeholder="Nachname *" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          </div>
          <input type="text" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} placeholder="Benutzername (Login) *" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="E-Mail (optional)" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Passwort *" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <select value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })} className="w-full p-3 rounded-lg outline-none" style={selectStyle}>
            <option value="director">Turnierleitung</option>
            <option value="referee">Schiedsrichter</option>
            <option value="gastronomy">Gastronomie</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={!canSubmit} className="w-full py-3 rounded-lg font-bold disabled:opacity-50" style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '48px', fontFamily: 'var(--pe-font-body)', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            User anlegen
          </button>
        </form>
      )}

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {users.map((u) => {
            const badge = ROLE_BADGE_STYLES[u.role] || { color: 'var(--pe-text-muted)', bg: 'rgba(90,115,148,0.15)', border: 'var(--pe-border)' };
            const isExpanded = editId === u.id;
            return (
              <div key={u.id} style={{ background: 'var(--pe-bg-card)', border: `1px solid ${isExpanded ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`, borderRadius: 'var(--pe-radius-md)', padding: '12px', opacity: u.active ? 1 : 0.5 }}>
                {/* Card header row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Avatar */}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: u.active ? 'var(--pe-gradient)' : 'var(--pe-bg-elevated)', border: u.active ? 'none' : '1px solid var(--pe-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', color: u.active ? 'var(--pe-text)' : 'var(--pe-text-muted)' }}>
                    {(u.vorname || u.username || '?')[0].toUpperCase()}
                  </div>
                  {/* Name + handle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--pe-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username}</div>
                    {u.display_name && <div style={{ fontSize: '10px', color: 'var(--pe-text-muted)' }}>@{u.username}</div>}
                  </div>
                  {/* Role badge */}
                  <span style={{ fontSize: '11px', height: '28px', padding: '0 8px', borderRadius: 'var(--pe-radius-md)', flexShrink: 0, whiteSpace: 'nowrap', color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, display: 'inline-flex', alignItems: 'center' }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {/* Edit / Close button — hidden for inactive users */}
                  {!!u.active && (
                    <button
                      onClick={() => isExpanded ? setEditId(null) : startEdit(u)}
                      style={{ ...btnSmall, fontSize: '11px', padding: '0 8px', height: '28px', minHeight: '28px', border: isExpanded ? `1px solid var(--pe-cyan-bright)` : '1px solid var(--pe-border)', background: isExpanded ? 'rgba(0,184,255,0.1)' : 'var(--pe-bg-elevated)', color: isExpanded ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isExpanded ? '✕' : '✏️'}
                    </button>
                  )}
                  {/* Deactivate / Reactivate button (collapsed only) */}
                  {!isExpanded && (u.active ? (
                    <button
                      onClick={() => handleDelete(u.id)}
                      style={{ ...btnSmall, fontSize: '11px', padding: '0 8px', height: '28px', minHeight: '28px', color: 'var(--pe-danger)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Deaktivieren
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(u.id)}
                      style={{ ...btnSmall, fontSize: '11px', padding: '0 8px', height: '28px', minHeight: '28px', color: 'var(--pe-success)', border: '1px solid var(--pe-success)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Reaktivieren
                    </button>
                  ))}
                </div>
                {/* Expanded accordion form */}
                {isExpanded && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      <input type="text" value={editForm.vorname} onChange={e => setEditForm({ ...editForm, vorname: e.target.value })} placeholder="Vorname" style={{ ...inputStyle, padding: '7px 10px', boxSizing: 'border-box' }} />
                      <input type="text" value={editForm.nickname} onChange={e => setEditForm({ ...editForm, nickname: e.target.value })} placeholder="Nickname" style={{ ...inputStyle, padding: '7px 10px', boxSizing: 'border-box' }} />
                      <input type="text" value={editForm.nachname} onChange={e => setEditForm({ ...editForm, nachname: e.target.value })} placeholder="Nachname" style={{ ...inputStyle, padding: '7px 10px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ ...selectStyle, padding: '7px 10px' }}>
                        <option value="director">Turnierleitung</option>
                        <option value="referee">Schiedsrichter</option>
                        <option value="gastronomy">Gastronomie</option>
                        <option value="admin">Admin</option>
                      </select>
                      <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Neues Passwort" style={{ ...inputStyle, padding: '7px 10px', boxSizing: 'border-box' }} />
                    </div>
                    <button onClick={() => handleSaveEdit(u.id)} style={{ ...btnSmall, background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', borderRadius: '7px', padding: '9px', fontSize: '11px', width: '100%' }}>
                      Speichern
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {users.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '13px', padding: '24px' }}>Keine User</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--pe-bg-card)', border: `1px solid ${editId === u.id ? 'var(--pe-blue-mid)' : 'var(--pe-border)'}` }}>
              {/* User-Zeile */}
              <div className="p-3 flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="min-w-0">
                    <span className="font-bold" style={{ color: u.active ? 'var(--pe-text)' : 'var(--pe-text-muted)' }}>{u.display_name || u.username}</span>
                    {u.display_name && <span className="ml-2 text-xs" style={{ color: 'var(--pe-text-muted)' }}>@{u.username}</span>}
                    {!u.active && <span className="ml-2 text-xs" style={{ color: 'var(--pe-danger)' }}>inaktiv</span>}
                  </div>
                  <span className="text-xs font-bold flex-shrink-0" style={{ height: '28px', padding: '0 8px', borderRadius: 'var(--pe-radius-md)', display: 'inline-flex', alignItems: 'center', color: ROLE_COLORS[u.role] || 'var(--pe-text-muted)', border: `1px solid ${ROLE_COLORS[u.role] || 'var(--pe-border)'}` }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                  {!!u.active && (
                    <button
                      onClick={() => editId === u.id ? setEditId(null) : startEdit(u)}
                      style={{ ...btnSmall, height: '32px', padding: '0 12px', background: editId === u.id ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)', color: editId === u.id ? 'var(--pe-text)' : 'var(--pe-text-sub)', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {editId === u.id ? 'Abbrechen' : 'Bearbeiten'}
                    </button>
                  )}
                  {u.active ? (
                    <button onClick={() => handleDelete(u.id)} style={{ ...btnSmall, height: '32px', padding: '0 12px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', display: 'inline-flex', alignItems: 'center' }}>
                      Deaktivieren
                    </button>
                  ) : (
                    <button onClick={() => handleReactivate(u.id)} style={{ ...btnSmall, height: '32px', padding: '0 12px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-success)', border: '1px solid var(--pe-success)', display: 'inline-flex', alignItems: 'center' }}>
                      Reaktivieren
                    </button>
                  )}
                </div>
              </div>

              {/* Inline-Edit-Bereich */}
              {editId === u.id && (
                <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--pe-border)', background: 'var(--pe-bg-elevated)' }}>
                  {/* Name — wie Spieler */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input type="text" value={editForm.vorname} onChange={e => setEditForm({ ...editForm, vorname: e.target.value })} placeholder="Vorname" style={{ ...inputStyle, padding: '10px 12px', width: '100%', boxSizing: 'border-box' }} />
                    <input type="text" value={editForm.nickname} onChange={e => setEditForm({ ...editForm, nickname: e.target.value })} placeholder="Nickname" style={{ ...inputStyle, padding: '10px 12px', width: '100%', boxSizing: 'border-box' }} />
                    <input type="text" value={editForm.nachname} onChange={e => setEditForm({ ...editForm, nachname: e.target.value })} placeholder="Nachname" style={{ ...inputStyle, padding: '10px 12px', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label className="text-xs font-bold block mb-1" style={{ color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rolle</label>
                      <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ ...selectStyle, width: '100%', padding: '10px 12px' }}>
                        <option value="director">Turnierleitung</option>
                        <option value="referee">Schiedsrichter</option>
                        <option value="gastronomy">Gastronomie</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1" style={{ color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Neues Passwort</label>
                      <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leer = unverändert" style={{ ...inputStyle, width: '100%', padding: '10px 12px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <button onClick={() => handleSaveEdit(u.id)} style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', borderRadius: 'var(--pe-radius-sm)', padding: '12px 20px', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', width: '100%', minHeight: '44px' }}>
                    Änderungen speichern
                  </button>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Keine User</p>}
        </div>
      )}
    </div>
  );
}

// NEU: Tab "Gastronomie (Admin)" — Produkt-Verwaltung + Umsatz + Tagesabrechnung
function GastroAdminTab() {
  const { addToast } = useToastStore();
  const [products, setProducts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'drink', price: '', sort_order: '0' });
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = () => {
    api.get('/products').then(setProducts).catch(() => {});
    api.get('/orders/dashboard').then(setDashboard).catch(() => {});
    api.get('/orders/summary').then(setSummary).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setIsSaving(true);
    try {
      await api.post('/products', { ...form, price: parseFloat(form.price), sort_order: parseInt(form.sort_order) || 0 });
      setForm({ name: '', category: 'drink', price: '', sort_order: '0' });
      setShowForm(false);
      loadData();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
    finally { setIsSaving(false); }
  };

  const toggleAvailable = async (product) => {
    try {
      await api.put(`/products/${product.id}`, { available: !product.available });
      loadData();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`"${product.name}" wirklich löschen?`)) return;
    try {
      await api.del(`/products/${product.id}`);
      loadData();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Löschen fehlgeschlagen' }); }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, price: String(parseFloat(product.price).toFixed(2)) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', price: '' });
  };

  const handleSaveEdit = async (product) => {
    if (!editForm.name.trim() || !editForm.price) return;
    setIsSavingEdit(true);
    try {
      await api.put(`/products/${product.id}`, { name: editForm.name.trim(), price: parseFloat(editForm.price) });
      setEditingId(null);
      loadData();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Speichern fehlgeschlagen' }); }
    finally { setIsSavingEdit(false); }
  };

  const totals = dashboard?.totals || {};
  const summaryProducts = summary?.products || [];

  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '10px 14px', fontSize: '13px', borderTop: '1px solid var(--pe-border)' };
  const inlineInputStyle = { background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', color: 'var(--pe-text)', borderRadius: 'var(--pe-radius-sm)', padding: '4px 8px', fontFamily: 'var(--pe-font-body)', fontSize: '13px', width: '100%', outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Gastronomie</h2>
      </div>

      {/* Umsatz-Kacheln */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
        {[
          { label: 'Gesamtumsatz', value: totals.grand_total, color: 'var(--pe-success)' },
          { label: 'Bezahlt', value: totals.total_paid, color: 'var(--pe-cyan-bright)' },
          { label: 'Offen', value: totals.total_open, color: 'var(--pe-warning)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '14px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{parseFloat(value || 0).toFixed(2)} €</div>
          </div>
        ))}
      </div>

      {/* Produkte */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Produkte ({products.length})</h3>
          <button onClick={() => setShowForm(!showForm)} style={{ ...btnSmall, background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', padding: '6px 14px' }}>
            {showForm ? 'Abbrechen' : '+ Neu'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ padding: '16px', borderRadius: 'var(--pe-radius-md)', marginBottom: '12px', background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name *" required style={{ ...inputStyle, gridColumn: '1/-1' }} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle}>
              <option value="drink">Getränk</option>
              <option value="food">Speise</option>
            </select>
            <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Preis (€) *" required style={inputStyle} />
            <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} placeholder="Sortierung" style={inputStyle} />
            <button type="submit" disabled={isSaving || !form.name.trim() || !form.price} style={{ gridColumn: '1/-1', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', borderRadius: 'var(--pe-radius-sm)', padding: '12px', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', minHeight: '44px', opacity: (isSaving || !form.name.trim() || !form.price) ? 0.5 : 1 }}>
              {isSaving ? 'Speichert...' : 'Produkt anlegen'}
            </button>
          </form>
        )}

        <div style={{ borderRadius: 'var(--pe-radius-md)', border: '1px solid var(--pe-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--pe-bg-elevated)' }}>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Preis</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Kategorie</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                <th style={{ ...thStyle, textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--pe-text-muted)' }}>Keine Produkte vorhanden</td></tr>
              )}
              {products.map(p => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} style={{ background: isEditing ? 'var(--pe-bg-elevated)' : p.available ? 'var(--pe-bg-card)' : 'var(--pe-bg-elevated)' }}>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: p.available ? 'var(--pe-text)' : 'var(--pe-text-muted)', minWidth: '120px' }}>
                      {isEditing
                        ? <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inlineInputStyle} autoFocus />
                        : p.name}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--pe-cyan-bright)', fontWeight: 'bold', minWidth: '90px' }}>
                      {isEditing
                        ? <input type="number" step="0.01" min="0" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} style={{ ...inlineInputStyle, textAlign: 'right' }} />
                        : `${parseFloat(p.price).toFixed(2)} €`}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--pe-radius-sm)', background: p.category === 'drink' ? 'rgba(0,184,255,0.15)' : 'rgba(255,176,32,0.15)', color: p.category === 'drink' ? 'var(--pe-cyan-bright)' : 'var(--pe-warning)' }}>
                        {p.category === 'drink' ? 'Getränk' : 'Speise'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => toggleAvailable(p)} style={{ ...btnSmall, background: p.available ? 'var(--pe-success)' : 'var(--pe-bg-card)', color: p.available ? '#000' : 'var(--pe-text-muted)', padding: '3px 10px', border: `1px solid ${p.available ? 'var(--pe-success)' : 'var(--pe-border)'}`, minWidth: '68px' }}>
                        {p.available ? 'Aktiv' : 'Inaktiv'}
                      </button>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => handleSaveEdit(p)} disabled={isSavingEdit || !editForm.name.trim() || !editForm.price} style={{ ...btnSmall, background: 'var(--pe-success)', color: '#000', border: 'none', padding: '3px 10px', opacity: (isSavingEdit || !editForm.name.trim() || !editForm.price) ? 0.5 : 1, cursor: (isSavingEdit || !editForm.name.trim() || !editForm.price) ? 'not-allowed' : 'pointer' }}>
                            {isSavingEdit ? '...' : 'Speichern'}
                          </button>
                          <button onClick={cancelEdit} style={{ ...btnSmall, background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', padding: '3px 10px' }}>
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => startEdit(p)} style={{ ...btnSmall, background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', padding: '3px 10px' }}>
                            Bearbeiten
                          </button>
                          <button onClick={() => handleDeleteProduct(p)} style={{ ...btnSmall, background: 'rgba(255,69,96,0.12)', color: 'var(--pe-danger)', border: '1px solid var(--pe-danger)', padding: '3px 10px' }}>
                            Löschen
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tagesabrechnung */}
      <div>
        <h3 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Tagesabrechnung</h3>
        <div style={{ borderRadius: 'var(--pe-radius-md)', border: '1px solid var(--pe-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--pe-bg-elevated)' }}>
              <tr>
                <th style={thStyle}>Produkt</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Menge</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Umsatz</th>
              </tr>
            </thead>
            <tbody>
              {summaryProducts.length === 0 && (
                <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'var(--pe-text-muted)' }}>Keine Bestellungen heute</td></tr>
              )}
              {summaryProducts.map((p, i) => (
                <tr key={i} style={{ background: 'var(--pe-bg-card)' }}>
                  <td style={{ ...tdStyle, color: 'var(--pe-text)' }}>{p.product_name}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--pe-text-sub)' }}>{p.total_quantity}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: 'var(--pe-success)' }}>{parseFloat(p.total_price || 0).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summaryProducts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '0 0 12px 12px', background: 'var(--pe-bg-elevated)', borderTop: '1px solid var(--pe-border)', marginTop: '-1px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--pe-text)' }}>Gesamtumsatz</span>
            <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--pe-success)' }}>{parseFloat(totals.grand_total || 0).toFixed(2)} €</span>
          </div>
        )}
      </div>
    </div>
  );
}

// NEU: Tab "Mailing" — Post-Event
function MailingTab() {
  const { addToast } = useToastStore();
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', body_html: '' });
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [mailStatus, setMailStatus] = useState(null);
  const [summaryForm, setSummaryForm] = useState({ email: '', tournament_id: '' });
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    api.get('/mail/templates').then(setTemplates).catch(() => {});
    api.get('/mail/status').then(setMailStatus).catch(() => setMailStatus({ configured: false }));
    api.get('/tournaments').then(setTournaments).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim()) return;
    try {
      await api.post('/mail/templates', form);
      setForm({ name: '', subject: '', body_html: '' });
      setShowForm(false);
      const updated = await api.get('/mail/templates');
      setTemplates(updated);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' });
    }
  };

  const handleTestMail = async () => {
    if (!testEmail.trim()) return;
    setSending(true);
    try {
      await api.post('/mail/send-test', { email: testEmail });
      addToast({ type: 'success', message: 'Test-Mail gesendet!' });
      setTestEmail('');
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Fehler beim Senden' });
    } finally {
      setSending(false);
    }
  };

  const handleSendEventSummary = async () => {
    if (!summaryForm.email.trim()) {
      addToast({ type: 'error', message: 'Bitte E-Mail-Adresse eingeben' });
      return;
    }
    if (!confirm(`Event-Zusammenfassung an ${summaryForm.email} senden?`)) return;
    setSending(true);
    try {
      await api.post('/mail/send-event-summary', {
        email: summaryForm.email,
        tournament_id: summaryForm.tournament_id ? Number(summaryForm.tournament_id) : undefined,
      });
      addToast({ type: 'success', message: 'Event-Zusammenfassung gesendet!' });
      setSummaryForm({ email: '', tournament_id: '' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Mailing</h2>
          {mailStatus && (
            <span style={{
              fontSize: '11px', fontWeight: 'bold',
              padding: '3px 10px', borderRadius: '20px',
              color: mailStatus.configured ? 'var(--pe-success)' : 'var(--pe-warning)',
              background: mailStatus.configured ? 'rgba(0,229,160,0.12)' : 'rgba(255,176,32,0.12)',
              border: `1px solid ${mailStatus.configured ? 'rgba(0,229,160,0.3)' : 'rgba(255,176,32,0.3)'}`,
            }}>
              {mailStatus.configured ? `✓ SMTP: ${mailStatus.host}` : '⚠ Dry-Run'}
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)' }}>
          {showForm ? 'Abbrechen' : '+ Template'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl mb-6 space-y-3" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Template-Name" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Betreff" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
          <textarea value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} placeholder="HTML Body" rows={6} className="w-full p-3 rounded-lg outline-none resize-y" style={{ ...inputStyle, minHeight: '120px' }} />
          {/* Placeholder chips */}
          <div>
            <p style={{ fontSize: '11px', color: 'var(--pe-text-muted)', margin: '0 0 6px' }}>
              Verfügbare Platzhalter (klicken zum Einfügen):
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { label: '{{tournament_name}}', desc: 'Turniername' },
                { label: '{{tournament_date}}', desc: 'Datum' },
                { label: '{{player_count}}', desc: 'Spieleranzahl' },
                { label: '{{game_count}}', desc: 'Spielanzahl' },
              ].map(ph => (
                <button
                  key={ph.label}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, body_html: (prev.body_html || '') + ph.label }))}
                  title={ph.desc}
                  style={{
                    background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)',
                    color: 'var(--pe-cyan-light, #5DD5FF)', borderRadius: '6px',
                    padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {ph.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!form.name.trim() || !form.subject.trim()} className="w-full py-3 rounded-lg font-bold disabled:opacity-50" style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '48px', fontFamily: 'var(--pe-font-body)' }}>
            Template speichern
          </button>
        </form>
      )}

      <div className="space-y-2 mb-6">
        {templates.map((t) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)',
            borderRadius: 'var(--pe-radius-md, 12px)', padding: '12px 16px',
          }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 'bold', color: 'var(--pe-text)', margin: 0 }}>{t.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--pe-text-sub)', margin: '2px 0 0' }}>Betreff: {t.subject}</p>
            </div>
            <button
              onClick={async () => {
                if (!confirm(`Template «${t.name}» löschen?`)) return;
                try {
                  await api.del(`/mail/templates/${t.id}`);
                  const updated = await api.get('/mail/templates');
                  setTemplates(updated);
                  addToast({ type: 'success', message: 'Template gelöscht' });
                } catch (err) {
                  addToast({ type: 'error', message: err.message || 'Löschen fehlgeschlagen' });
                }
              }}
              style={{
                background: 'rgba(255,69,96,0.12)', border: '1px solid rgba(255,69,96,0.3)',
                color: 'var(--pe-danger)', borderRadius: '8px',
                padding: '8px 12px', cursor: 'pointer',
                fontFamily: 'var(--pe-font-body)', fontSize: '12px', fontWeight: 'bold',
                flexShrink: 0, marginLeft: '12px',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Trash2 size={14} /> Löschen
            </button>
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Keine Templates</p>}
      </div>

      <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--pe-text-sub)' }}>TEST-MAIL</h3>
        <div className="flex gap-2">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@email.de" className="flex-1 p-3 rounded-lg outline-none" style={inputStyle} />
          <button onClick={handleTestMail} disabled={sending || !testEmail.trim()} className="px-4 py-3 rounded-lg font-bold text-sm disabled:opacity-50" style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)' }}>
            Senden
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: 'var(--pe-radius-md, 12px)', padding: '16px' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--pe-text-sub)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Event-Zusammenfassung
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            value={summaryForm.email}
            onChange={e => setSummaryForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Empfänger E-Mail *"
            style={{ ...inputStyle, minHeight: '52px' }}
          />
          <select
            value={summaryForm.tournament_id}
            onChange={e => setSummaryForm(prev => ({ ...prev, tournament_id: e.target.value }))}
            style={{ ...selectStyle, minHeight: '52px' }}
          >
            <option value="">Turnier wählen (optional)</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleSendEventSummary}
            disabled={sending || !summaryForm.email.trim()}
            style={{
              background: 'var(--pe-gradient)', color: 'var(--pe-text)',
              border: 'none', borderRadius: 'var(--pe-radius-md, 12px)',
              padding: '14px', fontFamily: 'var(--pe-font-body)',
              fontWeight: 'bold', fontSize: '15px',
              cursor: sending || !summaryForm.email.trim() ? 'not-allowed' : 'pointer',
              minHeight: '52px', opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'Wird gesendet...' : 'Zusammenfassung senden'}
          </button>
        </div>
      </div>
    </div>
  );
}

// NEU: Turnierleiter-Ansicht — Board-Spalten mit Spielqueue
const STATUS_DE = { pending: 'Ausstehend', bulloff: 'Ausbullen', active: 'Läuft', finished: 'Beendet' };
const STATUS_COLOR = { pending: 'var(--pe-text-muted)', bulloff: 'var(--pe-warning)', active: 'var(--pe-success)', finished: 'var(--pe-border)' };

function TournamentDirectorTab() {
  const [boards, setBoards] = useState([]);
  const [games, setGames] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [dragGameId, setDragGameId] = useState(null);
  const [dragOverBoard, setDragOverBoard] = useState(null);
  const [tapGameId, setTapGameId] = useState(null); // Mobile tap-to-assign selection

  const load = async () => {
    const [allBoards, t] = await Promise.all([
      api.get('/boards').catch(() => []),
      api.get('/tournaments').catch(() => []),
    ]);
    const active = t.find(x => x.status === 'active') || null;
    setActiveTournament(active);
    if (active) {
      // Only show boards belonging to the active tournament
      // Use loose equality to handle potential type mismatch between SQLite INTEGER and JS number
      const tournamentBoards = allBoards.filter(b => b.tournament_id == active.id);
      setBoards(tournamentBoards);
      const detail = await api.get(`/tournaments/${active.id}`).catch(() => null);
      if (detail?.games) setGames(detail.games.filter(g => ['pending','bulloff','active'].includes(g.status) && g.player1_name));
    } else {
      setBoards([]);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const i = setInterval(load, 10000); return () => clearInterval(i); }, []);

  const assignGame = async (gameId, boardId) => {
    setTapGameId(null);
    await api.put(`/games/${gameId}/assign-board`, { board_id: boardId });
    load();
  };
  const removeFromBoard = async (gameId) => {
    setTapGameId(null);
    await api.del(`/games/${gameId}/assign-board`);
    load();
  };

  // Tap-to-assign: select a pending game, then tap a board to assign
  const onTapGame = (g) => {
    if (g.status === 'active' || g.status === 'bulloff') return;
    setTapGameId(prev => prev === g.id ? null : g.id);
  };

  // Drag handlers
  const onDragStart = (e, gameId) => {
    setDragGameId(gameId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(gameId));
  };
  const onDragEnd = () => { setDragGameId(null); setDragOverBoard(null); };
  const onDragOver = (e, boardId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverBoard(boardId); };
  // Only reset dragOverBoard when leaving the drop zone itself, not a child element
  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverBoard(null);
  };
  const onDrop = async (e, boardId) => {
    e.preventDefault();
    setDragOverBoard(null);
    const id = parseInt(e.dataTransfer.getData('text/plain')) || dragGameId;
    if (id) { await assignGame(id, boardId); setDragGameId(null); }
  };
  // Drop auf "Nicht zugewiesen" Zone
  const onDropUnassigned = async (e) => {
    e.preventDefault();
    setDragOverBoard(null);
    const id = parseInt(e.dataTransfer.getData('text/plain')) || dragGameId;
    if (id) { await removeFromBoard(id); setDragGameId(null); }
  };

  // Group games by board
  const gamesByBoard = {};
  for (const b of boards) gamesByBoard[b.id] = [];
  for (const g of games) {
    if (g.board_id && gamesByBoard[g.board_id]) gamesByBoard[g.board_id].push(g);
  }
  const unassigned = games.filter(g => !g.board_id);

  const btnBase = { border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', borderRadius: 'var(--pe-radius-sm)', fontSize: '12px', minHeight: '36px' };

  const tapGame = tapGameId ? games.find(g => g.id === tapGameId) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
          Turnierleiter {activeTournament ? `— ${activeTournament.name}` : ''}
        </h2>
        <span style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>Auto-Refresh 10s</span>
      </div>

      {/* Status bar: drag hint OR tap-to-assign mode — only rendered when active */}
      {(dragGameId || tapGameId) && <div style={{
        marginBottom: '10px', padding: '10px 14px', borderRadius: 'var(--pe-radius-sm)',
        background: tapGameId ? 'rgba(0,229,160,0.1)' : 'rgba(0,184,255,0.1)',
        border: `1px solid ${tapGameId ? 'var(--pe-success)' : 'var(--pe-cyan-bright)'}`,
        color: tapGameId ? 'var(--pe-success)' : 'var(--pe-cyan-bright)',
        fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>
          {tapGameId
            ? `▶ ${tapGame?.player1_name} vs ${tapGame?.player2_name} — Board antippen zum Zuweisen`
            : '↗ Auf ein Board ziehen zum Zuweisen · auf «Nicht zugewiesen» ziehen zum Entfernen'}
        </span>
        {tapGameId && (
          <button onClick={() => setTapGameId(null)} style={{ background: 'none', border: 'none', color: 'var(--pe-success)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>✕</button>
        )}
      </div>}

      {/* Item 9: No active tournament message */}
      {!activeTournament && (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '15px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', marginBottom: '20px' }}>
          Kein aktives Turnier
        </div>
      )}

      {/* Board grid — responsive: auto-fill wraps on mobile */}
      {activeTournament && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {boards.map(board => {
          const boardGames = gamesByBoard[board.id] || [];
          const activeGame = boardGames.find(g => g.status === 'active' || g.status === 'bulloff');
          const queue = boardGames.filter(g => g.status === 'pending').sort((a, b) => a.id - b.id);
          const hasGames = boardGames.length > 0;
          const isDropTarget = dragOverBoard === board.id;
          const isTapTarget = !!tapGameId;

          return (
            <div key={board.id}
              onDragOver={e => onDragOver(e, board.id)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, board.id)}
              onClick={isTapTarget ? () => assignGame(tapGameId, board.id) : undefined}
              style={{
                background: isDropTarget || (isTapTarget && !activeGame) ? 'rgba(0,184,255,0.06)' : 'var(--pe-bg-card)',
                border: `2px solid ${isDropTarget ? 'var(--pe-cyan-bright)' : isTapTarget && !activeGame ? 'var(--pe-success)' : activeGame ? 'var(--pe-blue-mid)' : hasGames ? 'var(--pe-border)' : 'var(--pe-bg-elevated)'}`,
                borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                transition: 'border-color 0.15s, background 0.15s',
                cursor: isTapTarget && !activeGame ? 'pointer' : 'default',
              }}
            >
              {/* Board header */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--pe-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', background: activeGame ? 'rgba(30,127,235,0.12)' : 'transparent' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--pe-text)', fontSize: '15px', flex: 1, minWidth: 0 }}>
                  Board {board.number}{board.name ? ` — ${board.name}` : ''}{board.is_final ? ' ★' : ''}
                </span>
                <a href={`/referee/${board.number}`} target="_blank" rel="noopener noreferrer"
                   style={{ fontSize: '11px', color: 'var(--pe-cyan-bright)', textDecoration: 'none', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,184,255,0.1)', border: '1px solid rgba(0,184,255,0.2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  ↗ Referee
                </a>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--pe-radius-md)', fontWeight: 'bold', background: activeGame ? 'var(--pe-success)' : hasGames ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)', color: activeGame ? '#000' : 'var(--pe-text)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {activeGame ? 'Aktiv' : hasGames ? `${boardGames.length} Spiele` : isDropTarget || (isTapTarget && !activeGame) ? 'Hier zuweisen' : 'Frei'}
                </span>
              </div>

              {/* Tap-to-assign CTA when board is free */}
              {isTapTarget && !activeGame && !hasGames && (
                <div style={{ padding: '18px', textAlign: 'center', color: 'var(--pe-success)', fontSize: '13px', fontWeight: 'bold' }}>
                  Antippen zum Zuweisen
                </div>
              )}

              {/* Drop hint when empty and not tap mode */}
              {!hasGames && !isTapTarget && (
                <div style={{ padding: '20px', textAlign: 'center', color: isDropTarget ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)', fontSize: '12px', border: isDropTarget ? '2px dashed var(--pe-cyan-bright)' : '2px dashed transparent', margin: '8px', borderRadius: 'var(--pe-radius-sm)', transition: 'all 0.15s' }}>
                  {isDropTarget ? '⬇ Hier ablegen' : 'Spiel herziehen'}
                </div>
              )}

              {/* Active / current game */}
              {activeGame && (
                <div style={{ padding: '12px 14px', borderBottom: queue.length > 0 ? '1px solid var(--pe-border)' : 'none', background: 'rgba(30,127,235,0.07)' }}>
                  <div style={{ fontSize: '11px', color: STATUS_COLOR[activeGame.status], fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>
                    ▶ {STATUS_DE[activeGame.status]}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--pe-text)' }}>{activeGame.player1_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--pe-text-muted)', margin: '3px 0' }}>vs</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--pe-text)' }}>{activeGame.player2_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '4px' }}>Runde {activeGame.round === 0 ? 'Gruppe' : activeGame.round}</div>
                  <button onClick={e => { e.stopPropagation(); removeFromBoard(activeGame.id); }} style={{ ...btnBase, marginTop: '10px', width: '100%', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', border: '1px solid var(--pe-border)', minHeight: '44px' }}>
                    Freigeben
                  </button>
                </div>
              )}

              {/* Pending queue — draggable on desktop, tap-removable on mobile */}
              {queue.length > 0 && (
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {queue.map((g, idx) => (
                    <div key={g.id}
                      draggable
                      onDragStart={e => { e.stopPropagation(); onDragStart(e, g.id); }}
                      onDragEnd={onDragEnd}
                      style={{ padding: '10px 12px', borderRadius: 'var(--pe-radius-sm)', background: idx === 0 && !activeGame ? 'var(--pe-bg-elevated)' : 'var(--pe-bg)', border: `1px solid ${dragGameId === g.id ? 'var(--pe-cyan-bright)' : idx === 0 && !activeGame ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`, cursor: 'grab', opacity: dragGameId === g.id ? 0.5 : 1, userSelect: 'none' }}>
                      {idx === 0 && !activeGame && (
                        <div style={{ fontSize: '10px', color: 'var(--pe-cyan-bright)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '3px' }}>Nächstes</div>
                      )}
                      <div style={{ fontSize: '13px', color: 'var(--pe-text)', fontWeight: 'bold' }}>{g.player1_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginBottom: '2px' }}>vs {g.player2_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--pe-text-muted)' }}>Runde {g.round === 0 ? 'Gruppe' : g.round}</div>
                        <button onClick={e => { e.stopPropagation(); removeFromBoard(g.id); }} style={{ fontSize: '11px', background: 'none', border: 'none', color: 'var(--pe-danger)', cursor: 'pointer', padding: '4px 8px', minHeight: '32px' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Unassigned games — drag source + drop zone + tap-to-select */}
      {activeTournament && (
      <div
        onDragOver={e => { e.preventDefault(); setDragOverBoard('unassigned'); }}
        onDragLeave={onDragLeave}
        onDrop={onDropUnassigned}
      >
        <h3 style={{ color: dragOverBoard === 'unassigned' ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px', transition: 'color 0.15s' }}>
          Nicht zugewiesen ({unassigned.length})
          {dragOverBoard === 'unassigned' ? ' ← Hier ablegen zum Entfernen' : unassigned.length > 0 ? ' — Antippen oder ziehen zum Zuweisen' : ''}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', minHeight: '60px', border: dragOverBoard === 'unassigned' ? '2px dashed var(--pe-cyan-bright)' : '2px dashed transparent', borderRadius: 'var(--pe-radius-md)', padding: dragOverBoard === 'unassigned' ? '8px' : '2px', transition: 'all 0.15s' }}>
          {unassigned.map(g => {
            const isActive = g.status === 'active' || g.status === 'bulloff';
            const isSelected = tapGameId === g.id;
            return (
              <div key={g.id}
                draggable={!isActive}
                onDragStart={!isActive ? e => onDragStart(e, g.id) : undefined}
                onDragEnd={!isActive ? onDragEnd : undefined}
                onClick={!isActive ? () => onTapGame(g) : undefined}
                style={{
                  padding: '12px', borderRadius: 'var(--pe-radius-md)',
                  background: isSelected ? 'rgba(0,229,160,0.12)' : dragGameId === g.id ? 'rgba(0,184,255,0.1)' : 'var(--pe-bg-elevated)',
                  border: `2px solid ${isActive ? 'var(--pe-warning)' : isSelected ? 'var(--pe-success)' : dragGameId === g.id ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`,
                  cursor: isActive ? 'not-allowed' : 'pointer',
                  opacity: dragGameId === g.id ? 0.6 : 1,
                  transition: 'all 0.1s', userSelect: 'none',
                }}>
                {isActive && <div style={{ fontSize: '10px', color: 'var(--pe-warning)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>▶ Läuft</div>}
                {isSelected && <div style={{ fontSize: '10px', color: 'var(--pe-success)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>✓ Ausgewählt</div>}
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--pe-text)', lineHeight: 1.3 }}>{g.player1_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', margin: '2px 0' }}>vs</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--pe-text)', lineHeight: 1.3 }}>{g.player2_name}</div>
                <div style={{ fontSize: '10px', color: 'var(--pe-text-muted)', marginTop: '4px' }}>Runde {g.round === 0 ? 'Gruppe' : g.round}</div>
              </div>
            );
          })}
          {unassigned.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '12px', padding: '16px' }}>Alle Spiele zugewiesen</div>
          )}
        </div>
      </div>
      )}

    </div>
  );
}

const FORMAT_OPTIONS = [
  { value: '501_double_out', label: '501 — Double Out' },
  { value: '501_single_out', label: '501 — Single Out' },
  { value: '301_double_out', label: '301 — Double Out' },
  { value: '301_single_out', label: '301 — Single Out' },
];

function TournamentExtendedTab() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [groups, setGroups] = useState([]);
  const [boards, setBoards] = useState([]);
  const [wizardStep, setWizardStep] = useState(0); // 0=list, 1=basic, 2=format, 3=players, 4=draw
  const [numGroups, setNumGroups] = useState(4);
  const [creating, setCreating] = useState(false);
  const [newTournament, setNewTournament] = useState(null); // after step 1
  const [createForm, setCreateForm] = useState({ name: '', date: '', format: '501', checkout: 'double_out', use_seed: false });
  const [config, setConfig] = useState({
    prelim_format: '301_single_out', prelim_legs: '1',
    qf_format: '501_double_out',     qf_legs: '3',
    sf_format: '501_double_out',     sf_legs: '3',
    final_format: '501_double_out',  final_legs: '5',
    board_count: '1',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [playerForm, setPlayerForm] = useState({ vorname: '', nickname: '', nachname: '', seed: '', walk_on_song: '', walkon_start: 0, walkon_duration: 30 });
  const [players, setPlayers] = useState([]);
  const [mockCount, setMockCount] = useState('8');
  const [wizardError, setWizardError] = useState(''); // inline error for wizard steps
  const [openGroups, setOpenGroups] = useState(new Set()); // collapsible group cards — default all collapsed
  const [addPlayerMode, setAddPlayerMode] = useState(null); // null | 'search' | 'new'
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSearchResults, setPlayerSearchResults] = useState([]);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);

  const loadTournaments = () => {
    api.get('/tournaments').then((t) => {
      setTournaments(t);
      if (t.length > 0 && !selectedId) setSelectedId(String(t[0].id));
    }).catch(() => {});
  };

  const loadBoards = (tid) => {
    if (!tid) { setBoards([]); return; }
    api.get(`/boards?tournament_id=${tid}`).then(setBoards).catch(() => {});
  };

  useEffect(() => { loadTournaments(); }, []);
  useEffect(() => { loadBoards(selectedId); }, [selectedId]);

  useEffect(() => {
    if (!selectedId || tournaments.length === 0) return;
    const t = tournaments.find((x) => String(x.id) === String(selectedId));
    if (t) {
      setConfig({
        prelim_format: t.prelim_format || '301_single_out',
        prelim_legs:   String(t.prelim_legs  ?? 1),
        qf_format:     t.qf_format    || '501_double_out',
        qf_legs:       String(t.qf_legs      ?? 3),
        sf_format:     t.sf_format    || '501_double_out',
        sf_legs:       String(t.sf_legs      ?? 3),
        final_format:  t.final_format || '501_double_out',
        final_legs:    String(t.final_legs   ?? 5),
        board_count:   String(t.board_count  ?? 1),
      });
    }
    api.get(`/tournaments/${selectedId}/groups`).then((d) => setGroups(d.groups || [])).catch(() => setGroups([]));
    api.get(`/tournaments/${selectedId}/players`).then(setPlayers).catch(() => setPlayers([]));
  }, [selectedId, tournaments.length]);

  const selectedTournament = tournaments.find((t) => String(t.id) === String(selectedId));

  useEffect(() => {
    if (!playerSearch.trim() || addPlayerMode !== 'search') {
      setPlayerSearchResults([]);
      return;
    }
    const tid = newTournament?.id || selectedId;
    const timer = setTimeout(async () => {
      setPlayerSearchLoading(true);
      try {
        const results = await api.get(`/players/search?q=${encodeURIComponent(playerSearch.trim())}&tournament_id=${tid}`);
        setPlayerSearchResults(results);
      } catch { setPlayerSearchResults([]); }
      finally { setPlayerSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [playerSearch, addPlayerMode, newTournament, selectedId]);

  // --- Wizard Step 1: Turnier anlegen ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreating(true);
    setWizardError('');
    try {
      const t = await api.post('/tournaments', createForm);
      setNewTournament(t);
      setSelectedId(String(t.id));
      await loadTournaments();
      setWizardStep(2); // direkt zu Format
    } catch (err) { setWizardError(err.message || 'Turnier konnte nicht angelegt werden – bitte erneut versuchen.'); }
    finally { setCreating(false); }
  };

  // --- Wizard Step 2: Format speichern + Boards auto-erstellen ---
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setWizardError('');
    const tid = newTournament?.id || selectedId;
    const boardCount = parseInt(config.board_count) || 1;
    try {
      await api.put(`/tournaments/${tid}`, {
        prelim_format: config.prelim_format, prelim_legs: parseInt(config.prelim_legs) || 1,
        qf_format:     config.qf_format,     qf_legs:    parseInt(config.qf_legs)    || 3,
        sf_format:     config.sf_format,     sf_legs:    parseInt(config.sf_legs)    || 3,
        final_format:  config.final_format,  final_legs: parseInt(config.final_legs) || 5,
        board_count:   boardCount,
      });
      // Auto-create boards for this tournament if they don't exist yet
      const existingBoards = await api.get(`/boards?tournament_id=${tid}`).catch(() => []);
      // eslint-disable-next-line eqeqeq
      const tournamentBoards = existingBoards.filter(b => b.tournament_id == tid);
      if (tournamentBoards.length < boardCount) {
        const toCreate = boardCount - tournamentBoards.length;
        const startNumber = tournamentBoards.length + 1;
        const createPromises = Array.from({ length: toCreate }, (_, i) =>
          api.post('/boards', { number: startNumber + i, tournament_id: tid }).catch(() => null)
        );
        await Promise.all(createPromises);
        await loadTournaments();
        loadBoards(tid);
      }
      setWizardStep(3);
    } catch (err) { setWizardError(err.message || 'Konfiguration konnte nicht gespeichert werden – bitte erneut versuchen.'); }
    finally { setSavingConfig(false); }
  };

  // --- Wizard Step 3: Spieler ---
  const addPlayer = async (e) => {
    e.preventDefault();
    if (!playerForm.vorname.trim() || !playerForm.nickname.trim() || !playerForm.nachname.trim()) return;
    const tid = newTournament?.id || selectedId;
    setWizardError('');
    try {
      const res = await api.post(`/tournaments/${tid}/players`, {
        vorname: playerForm.vorname.trim(),
        nickname: playerForm.nickname.trim(),
        nachname: playerForm.nachname.trim(),
        seed: playerForm.seed ? parseInt(playerForm.seed) : undefined,
      });
      const newPlayerId = res.id || res.player_id || res.player?.id;
      if (playerForm.walk_on_song && newPlayerId) {
        try {
          await api.post(`/walkon/${newPlayerId}`, {
            url: playerForm.walk_on_song,
            start: Number(playerForm.walkon_start) || 0,
            duration: Number(playerForm.walkon_duration) || 30,
          });
        } catch (err) { console.warn('Walk-On Job konnte nicht gestartet werden:', err.message); }
      }
      setPlayerForm({ vorname: '', nickname: '', nachname: '', seed: '', walk_on_song: '', walkon_start: 0, walkon_duration: 30 });
      setAddPlayerMode(null);
      const updated = await api.get(`/tournaments/${tid}/players`);
      setPlayers(updated);
    } catch (err) { setWizardError(err.message || 'Spieler konnte nicht hinzugefügt werden – bitte erneut versuchen.'); }
  };

  const registerExistingPlayer = async (player) => {
    const tid = newTournament?.id || selectedId;
    setWizardError('');
    try {
      await api.post(`/tournaments/${tid}/players`, { player_id: player.id });
      setPlayerSearch('');
      setPlayerSearchResults([]);
      setAddPlayerMode(null);
      const updated = await api.get(`/tournaments/${tid}/players`);
      setPlayers(updated);
    } catch (err) { setWizardError(err.message || 'Anmeldung fehlgeschlagen'); }
  };

  const deletePlayer = async (playerId) => {
    const tid = newTournament?.id || selectedId;
    if (!confirm('Spieler löschen?')) return;
    try {
      await api.del(`/tournaments/${tid}/players/${playerId}`);
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    } catch (err) { setWizardError(err.message || 'Spieler konnte nicht gelöscht werden – bitte erneut versuchen.'); }
  };

  const handleMock = async () => {
    const tid = newTournament?.id || selectedId;
    if (!confirm(`${mockCount} Fake-Spieler erstellen?`)) return;
    setWizardError('');
    try {
      await api.post(`/tournaments/${tid}/mock`, { player_count: parseInt(mockCount) });
      const updated = await api.get(`/tournaments/${tid}/players`);
      setPlayers(updated);
    } catch (err) { setWizardError(err.message || 'Simulation fehlgeschlagen – bitte erneut versuchen.'); }
  };

  // --- Wizard Step 4: Auslosung ---
  // Aktueller Turnierstatus (wird nach jeder Aktion aktualisiert)
  const [wizardTour, setWizardTour] = useState(null); // aktuelles Turnier-Objekt mit status/group_draw_done

  const refreshWizardTour = async () => {
    const tid = newTournament?.id || selectedId;
    if (!tid) return null;
    try {
      const t = await api.get(`/tournaments/${tid}`);
      setWizardTour(t);
      if (t.group_draw_done) {
        const gd = await api.get(`/tournaments/${tid}/groups`);
        setGroups(gd.groups || []);
      }
      return t;
    } catch { return null; }
  };

  useEffect(() => { if (wizardStep === 4) refreshWizardTour(); }, [wizardStep]);

  const drawGroups = async () => {
    const tid = newTournament?.id || selectedId;
    const groupCount = parseInt(numGroups) || 2;
    // Item 4: Inline validation — minimum 2 groups, at least 2 players per group
    if (groupCount < 2) {
      setWizardError('Mindestens 2 Gruppen erforderlich.');
      return;
    }
    if (players.length < groupCount * 2) {
      setWizardError(`Zu wenige Spieler: Für ${groupCount} Gruppen werden mindestens ${groupCount * 2} Spieler benötigt.`);
      return;
    }
    setWizardError('');
    try {
      await api.post(`/tournaments/${tid}/draw-groups`, { numGroups });
      const t = await refreshWizardTour();
      // Item 6: Auto-assign boards to groups in sequence after draw
      if (t?.group_draw_done) {
        const groupData = await api.get(`/tournaments/${tid}/groups`).catch(() => null);
        const drawnGroups = groupData?.groups || [];
        const availableBoards = await api.get(`/boards?tournament_id=${tid}`).catch(() => []);
        // eslint-disable-next-line eqeqeq
        const tournamentBoards = availableBoards.filter(b => b.tournament_id == tid).sort((a, b) => a.number - b.number);
        await Promise.all(
          drawnGroups.map((g, i) => {
            const board = tournamentBoards[i % tournamentBoards.length];
            if (board) return api.put(`/tournaments/${tid}/groups/${g.id}/board`, { board_id: board.id }).catch(() => null);
            return Promise.resolve();
          })
        );
        const refreshed = await api.get(`/tournaments/${tid}/groups`).catch(() => null);
        if (refreshed) setGroups(refreshed.groups || []);
      }
    } catch (err) { setWizardError(err.message || 'Auslosung fehlgeschlagen – bitte erneut versuchen.'); }
  };

  const generateGroupSchedule = async () => {
    const tid = newTournament?.id || selectedId;
    if (!tid) return;
    setWizardError('');
    try {
      await api.post(`/tournaments/${tid}/generate-group-schedule`);
      await refreshWizardTour();
      await loadTournaments();
    } catch (err) { setWizardError(err.message || 'Spielplan konnte nicht generiert werden – bitte erneut versuchen.'); }
  };

  const startTournament = async () => {
    const tid = newTournament?.id || selectedId;
    setWizardError('');
    try {
      await api.put(`/tournaments/${tid}/start`);
      await loadTournaments();
      setWizardStep(0);
      setNewTournament(null);
      setWizardTour(null);
    } catch (err) { setWizardError(err.message || 'Turnier konnte nicht gestartet werden – bitte erneut versuchen.'); }
  };

  const lockTournament = async () => {
    if (!confirm('Turnier wirklich abschließen?')) return;
    try { await api.put(`/tournaments/${selectedId}/lock`); loadTournaments(); }
    catch (err) { setWizardError(err.message || 'Turnier konnte nicht abgeschlossen werden – bitte erneut versuchen.'); }
  };

  const deleteTournament = async (id) => {
    if (!confirm('Turnier und alle Daten löschen?')) return;
    try { await api.del(`/tournaments/${id}`); setSelectedId(''); loadTournaments(); }
    catch (err) { setWizardError(err.message || 'Turnier konnte nicht gelöscht werden – bitte erneut versuchen.'); }
  };

  const assignGroupToBoard = async (groupId, boardId) => {
    const tid = newTournament?.id || selectedId;
    try {
      await api.put(`/tournaments/${tid}/groups/${groupId}/board`, { board_id: boardId || null });
      const data = await api.get(`/tournaments/${tid}/groups`);
      setGroups(data.groups || []);
    } catch (err) { setWizardError(err.message || 'Board-Zuordnung fehlgeschlagen – bitte erneut versuchen.'); }
  };

  const card = { background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: 'var(--pe-radius-md)', padding: '16px', marginBottom: '12px' };

  // WIZARD MODE (steps 1-4)
  if (wizardStep > 0) {
    const steps = ['', 'Grunddaten', 'Format', 'Spieler', 'Auslosung'];
    return (
      <div>
        {/* Wizard Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => { setWizardStep(0); setNewTournament(null); }} style={{ background: 'none', border: 'none', color: 'var(--pe-text-muted)', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', flex: 1 }}>
            Neues Turnier — Schritt {wizardStep}/4: {steps[wizardStep]}
          </h2>
        </div>
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: s <= wizardStep ? 'var(--pe-cyan-bright)' : 'var(--pe-border)' }} />
          ))}
        </div>

        {/* Inline error display */}
        {wizardError && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: 'var(--pe-radius-md)', background: 'rgba(255,69,96,0.1)', border: '1px solid var(--pe-danger)', color: 'var(--pe-danger)', fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{wizardError}</span>
            <button onClick={() => setWizardError('')} style={{ background: 'none', border: 'none', color: 'var(--pe-danger)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>✕</button>
          </div>
        )}

        {/* Step 1: Grunddaten */}
        {wizardStep === 1 && (
          <form onSubmit={handleCreate} style={card}>
            <p style={{ color: 'var(--pe-text-sub)', fontSize: '13px', marginBottom: '16px' }}>Gib dem Turnier einen Namen und optionales Datum.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="Turniername *" required style={{ ...inputStyle, padding: '12px 14px' }} />
              <input type="date" value={createForm.date} onChange={e => setCreateForm({...createForm, date: e.target.value})} style={{ ...inputStyle, padding: '12px 14px', cursor: 'pointer' }} />
            </div>
            {/* Seeding toggle */}
            <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: createForm.use_seed ? '8px' : '0' }}>
                <span style={{ color: 'var(--pe-text-sub)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'var(--pe-font-body)' }}>Seeding verwenden?</span>
                <button
                  type="button"
                  onClick={() => setCreateForm({...createForm, use_seed: !createForm.use_seed})}
                  style={{ padding: '6px 16px', borderRadius: 'var(--pe-radius-xl)', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', minHeight: '36px', minWidth: '64px', background: createForm.use_seed ? 'var(--pe-success)' : 'var(--pe-bg-card)', color: createForm.use_seed ? '#000' : 'var(--pe-text-muted)', border: createForm.use_seed ? 'none' : '1px solid var(--pe-border)', transition: 'background 0.2s' }}
                >
                  {createForm.use_seed ? 'ON' : 'OFF'}
                </button>
              </div>
              {createForm.use_seed
                ? <p style={{ color: 'var(--pe-success)', fontSize: '11px', margin: '0', lineHeight: '1.4' }}>Spieler können eine Setzposition erhalten. Top-Gesetzte kommen in verschiedene Gruppen.</p>
                : null
              }
              {!createForm.use_seed
                ? <p style={{ color: 'var(--pe-text-muted)', fontSize: '11px', margin: '0', lineHeight: '1.4' }}>Auslosung komplett zufällig.</p>
                : null
              }
            </div>
            <button type="submit" disabled={creating || !createForm.name.trim()} style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', minHeight: '52px', opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Wird angelegt...' : 'Turnier anlegen & weiter →'}
            </button>
          </form>
        )}

        {/* Step 2: Format */}
        {wizardStep === 2 && (
          <div style={card}>
            <p style={{ color: 'var(--pe-text-sub)', fontSize: '13px', marginBottom: '16px' }}>Format und Legs pro Runde konfigurieren.</p>
            {[
              { key: 'prelim', label: 'Vorrunde / Gruppen' },
              { key: 'qf',     label: 'Viertelfinale' },
              { key: 'sf',     label: 'Halbfinale' },
              { key: 'final',  label: 'Finale' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ color: 'var(--pe-text-sub)', fontSize: '13px', fontWeight: 'bold' }}>{label}</div>
                <select value={config[`${key}_format`]} onChange={e => setConfig({...config, [`${key}_format`]: e.target.value})} style={{ ...selectStyle, padding: '8px', fontSize: '13px' }}>
                  {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" min="1" max="11" value={config[`${key}_legs`]} onChange={e => setConfig({...config, [`${key}_legs`]: e.target.value})} style={{ ...inputStyle, width: '60px', padding: '8px', textAlign: 'center', fontSize: '13px' }} />
                  <span style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>Legs</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <span style={{ color: 'var(--pe-text-sub)', fontSize: '13px', fontWeight: 'bold' }}>Anzahl Boards</span>
              <input type="number" min="1" value={config.board_count} onChange={e => setConfig({...config, board_count: e.target.value})} style={{ ...inputStyle, width: '70px', padding: '8px', textAlign: 'center' }} />
            </div>
            <button onClick={handleSaveConfig} disabled={savingConfig} style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', minHeight: '52px', opacity: savingConfig ? 0.6 : 1 }}>
              {savingConfig ? 'Speichern...' : 'Format speichern & weiter →'}
            </button>
          </div>
        )}

        {/* Step 3: Spieler */}
        {wizardStep === 3 && (
          <div>
            <div style={card}>
              <p style={{ color: 'var(--pe-text-sub)', fontSize: '13px', marginBottom: '12px' }}>Spieler anmelden oder Simulation für Tests nutzen.</p>

              {/* Add player buttons */}
              {!addPlayerMode && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button type="button" onClick={() => setAddPlayerMode('search')}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--pe-bg-elevated)',
                             border: '1px solid var(--pe-border)', color: 'var(--pe-text)', cursor: 'pointer',
                             fontFamily: 'var(--pe-font-body)', minHeight: 48 }}>
                    🔍 Bestehenden Spieler anmelden
                  </button>
                  <button type="button" onClick={() => setAddPlayerMode('new')}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--pe-bg-elevated)',
                             border: '1px solid var(--pe-border)', color: 'var(--pe-text)', cursor: 'pointer',
                             fontFamily: 'var(--pe-font-body)', minHeight: 48 }}>
                    + Neuen Spieler anlegen
                  </button>
                </div>
              )}

              {/* Search mode */}
              {addPlayerMode === 'search' && (
                <div style={{ marginBottom: 12 }}>
                  <button type="button" onClick={() => { setAddPlayerMode(null); setPlayerSearch(''); setPlayerSearchResults([]); }}
                    style={{ fontSize: 11, color: 'var(--pe-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4, fontFamily: 'var(--pe-font-body)' }}>
                    ← Abbrechen
                  </button>
                  <input
                    type="text" value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder='Spieler suchen (Vorname, Nickname, Nachname)…'
                    autoFocus
                    style={inputStyle}
                    className="w-full p-3 rounded-lg outline-none"
                  />
                  {playerSearchLoading && <p style={{ color: 'var(--pe-text-muted)', fontSize: 12, marginTop: 4 }}>Suche…</p>}
                  {playerSearchResults.map(p => (
                    <button key={p.id} type="button" onClick={() => registerExistingPlayer(p)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                               width: '100%', padding: '10px 14px', marginTop: 4, borderRadius: 8,
                               background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)',
                               color: 'var(--pe-text)', cursor: 'pointer', fontFamily: 'var(--pe-font-body)',
                               minHeight: 48, textAlign: 'left' }}>
                      <span>{p.name}</span>
                      <span style={{ color: 'var(--pe-text-muted)', fontSize: 12 }}>anmelden →</span>
                    </button>
                  ))}
                  {playerSearch.trim() && !playerSearchLoading && playerSearchResults.length === 0 && (
                    <p style={{ color: 'var(--pe-text-muted)', fontSize: 12, marginTop: 4 }}>Keine Spieler gefunden.</p>
                  )}
                </div>
              )}

              {/* New player form */}
              {addPlayerMode === 'new' && (
                <form onSubmit={addPlayer} style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" onClick={() => setAddPlayerMode(null)}
                    style={{ fontSize: 11, color: 'var(--pe-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4, fontFamily: 'var(--pe-font-body)', alignSelf: 'flex-start' }}>
                    ← Abbrechen
                  </button>
                  <input type="text" value={playerForm.vorname} onChange={e => setPlayerForm({...playerForm, vorname: e.target.value})}
                    placeholder="Vorname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                  <input type="text" value={playerForm.nickname} onChange={e => setPlayerForm({...playerForm, nickname: e.target.value})}
                    placeholder="Nickname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                  <input type="text" value={playerForm.nachname} onChange={e => setPlayerForm({...playerForm, nachname: e.target.value})}
                    placeholder="Nachname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                  <input type="url" value={playerForm.walk_on_song} onChange={e => setPlayerForm({...playerForm, walk_on_song: e.target.value})}
                    placeholder="Walk-On Song URL (optional)" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                  {playerForm.walk_on_song && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: 'var(--pe-text-muted)', display: 'block', marginBottom: 4 }}>Startzeit (Sek.)</label>
                        <input type="number" min="0" value={playerForm.walkon_start}
                          onChange={e => setPlayerForm({...playerForm, walkon_start: e.target.value})}
                          className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11, color: 'var(--pe-text-muted)', display: 'block', marginBottom: 4 }}>Länge (Sek.)</label>
                        <input type="number" min="5" max="120" value={playerForm.walkon_duration}
                          onChange={e => setPlayerForm({...playerForm, walkon_duration: e.target.value})}
                          className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
                      </div>
                    </div>
                  )}
                  {playerForm.vorname && playerForm.nickname && playerForm.nachname && (
                    <p style={{ fontSize: 12, color: 'var(--pe-text-muted)' }}>
                      Angezeigt als: <strong style={{ color: 'var(--pe-text)' }}>{playerForm.vorname.trim()} &quot;{playerForm.nickname.trim()}&quot; {playerForm.nachname.trim()}</strong>
                    </p>
                  )}
                  <button type="submit" disabled={!playerForm.vorname.trim() || !playerForm.nickname.trim() || !playerForm.nachname.trim()}
                    className="w-full py-3 rounded-lg font-bold disabled:opacity-50"
                    style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: 48, fontFamily: 'var(--pe-font-body)' }}>
                    Spieler anlegen &amp; anmelden
                  </button>
                </form>
              )}
              {/* Mock */}
              <div style={{ display: 'flex', gap: '8px', padding: '10px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-bg-elevated)', border: '1px dashed var(--pe-border)' }}>
                <input
                  type="number" min="2" max="64" value={mockCount}
                  onChange={e => setMockCount(e.target.value)}
                  placeholder="Anzahl (2–64)"
                  style={{ flex: 1, ...inputStyle, padding: '8px' }}
                />
                <button onClick={handleMock} style={{ padding: '8px 16px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-warning)', color: '#000', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '48px' }}>Simulieren</button>
              </div>
            </div>
            {/* Spieler-Liste */}
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {players.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
                  <span style={{ color: 'var(--pe-text)', fontWeight: 'bold' }}>{p.name}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(newTournament?.use_seed || createForm.use_seed) && p.seed && <span style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>#{p.seed}</span>}
                    <button onClick={() => deletePlayer(p.id)} style={{ ...btnSmall, padding: '4px 10px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', minHeight: '30px' }}>✕</button>
                  </div>
                </div>
              ))}
              {players.length === 0 && <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', padding: '16px' }}>Noch keine Spieler</p>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setWizardStep(2)} style={{ flex: 1, padding: '14px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', border: '1px solid var(--pe-border)', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '52px' }}>← Zurück</button>
              <button onClick={() => setWizardStep(4)} disabled={players.length < 2} style={{ flex: 2, padding: '14px', borderRadius: 'var(--pe-radius-md)', background: players.length >= 2 ? 'var(--pe-gradient)' : 'var(--pe-bg-elevated)', color: players.length >= 2 ? 'var(--pe-text)' : 'var(--pe-text-muted)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '16px', cursor: players.length >= 2 ? 'pointer' : 'not-allowed', minHeight: '52px' }}>
                Weiter mit {players.length} Spielern →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Auslosung / Start */}
        {wizardStep === 4 && (() => {
          const tourStatus = wizardTour?.status || newTournament?.status || 'open';
          const groupDrawDone = !!(wizardTour?.group_draw_done ?? newTournament?.group_draw_done);

          // Phase C: Turnier läuft
          if (tourStatus === 'active') {
            return (
              <div>
                <div style={{ ...card, borderColor: 'var(--pe-success)', textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
                  <div style={{ color: 'var(--pe-success)', fontWeight: 'bold', fontSize: '20px', marginBottom: '8px' }}>Turnier läuft!</div>
                  <div style={{ color: 'var(--pe-text-sub)', fontSize: '14px', marginBottom: '24px' }}>
                    {wizardTour?.name || newTournament?.name} wurde erfolgreich gestartet.
                  </div>
                  <button onClick={() => { setWizardStep(0); setNewTournament(null); setWizardTour(null); }} style={{ padding: '14px 28px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '52px' }}>
                    Zur Turnierliste →
                  </button>
                </div>
              </div>
            );
          }

          // Phase B: Gruppen ausgelost → Board-Zuordnung + Spielplan starten
          if (groupDrawDone && groups.length > 0) {
            return (
              <div>
                {/* Status Banner */}
                <div style={{ ...card, borderColor: 'var(--pe-blue-mid)', background: 'rgba(30,127,235,0.08)', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                  <span style={{ fontSize: '22px' }}>✅</span>
                  <div>
                    <div style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '14px' }}>{groups.length} Gruppen ausgelost</div>
                    <div style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>Prüfe die Board-Zuordnung und starte dann den Spielplan.</div>
                  </div>
                </div>

                {/* Nächster Schritt Banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--pe-radius-md)', background: 'rgba(255,176,32,0.1)', border: '1px solid var(--pe-warning)', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--pe-warning)', fontSize: '16px' }}>→</span>
                  <span style={{ color: 'var(--pe-warning)', fontSize: '13px', fontWeight: 'bold' }}>Nächster Schritt: Board-Zuordnung prüfen, dann Spielplan generieren</span>
                </div>

                {/* Gruppen & Board-Zuordnung — collapsible cards */}
                <div style={card}>
                  <h3 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Gruppen — Board-Zuordnung</h3>
                  {groups.map(g => {
                    const isOpen = openGroups.has(g.id);
                    const playerList = g.standings || g.players || [];
                    return (
                      <div key={g.id} style={{ borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-elevated)', marginBottom: '8px', border: g.board_id ? '1px solid var(--pe-blue-mid)' : '1px solid var(--pe-border)', overflow: 'hidden' }}>
                        {/* Card header — always visible, tap to toggle */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setOpenGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(g.id)) next.delete(g.id); else next.add(g.id);
                            return next;
                          })}
                          onKeyDown={e => e.key === 'Enter' && setOpenGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(g.id)) next.delete(g.id); else next.add(g.id);
                            return next;
                          })}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', minHeight: '52px', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <span style={{ color: 'var(--pe-text)', fontWeight: 'bold', fontSize: '14px' }}>Gruppe {g.name}</span>
                            <span style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>{playerList.length} Spieler</span>
                            {g.board_id && <span style={{ fontSize: '11px', color: 'var(--pe-success)', fontWeight: 'bold' }}>✓</span>}
                          </div>
                          {/* Board dropdown — always accessible even when collapsed */}
                          <select
                            value={g.board_id || ''}
                            onClick={e => e.stopPropagation()}
                            onChange={e => assignGroupToBoard(g.id, e.target.value ? parseInt(e.target.value) : null)}
                            style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', color: 'var(--pe-text)', borderRadius: 'var(--pe-radius-sm)', padding: '6px 10px', fontSize: '13px', fontFamily: 'var(--pe-font-body)', minHeight: '44px', marginRight: '10px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235A7394' d='M6 8L1 3h10z'/%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '30px' }}
                          >
                            <option value="">Kein Board</option>
                            {boards.map(b => <option key={b.id} value={b.id}>Board {b.number}{b.is_final ? ' ★' : ''}</option>)}
                          </select>
                          <span style={{ color: 'var(--pe-text-muted)', fontSize: '16px', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                        {/* Player list — only visible when open */}
                        {isOpen && (
                          <div style={{ borderTop: '1px solid var(--pe-border)', padding: '8px 14px 12px' }}>
                            {playerList.length === 0
                              ? <span style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>Keine Spieler</span>
                              : playerList.map((p, idx) => (
                                <div key={p.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: idx < playerList.length - 1 ? '1px solid var(--pe-border)' : 'none' }}>
                                  {p.seed != null && <span style={{ color: 'var(--pe-text-muted)', fontSize: '11px', minWidth: '24px' }}>#{p.seed}</span>}
                                  <span style={{ color: 'var(--pe-text)', fontSize: '13px' }}>{p.name}</span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Primärer CTA */}
                <button onClick={generateGroupSchedule} style={{ width: '100%', padding: '16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '60px', fontSize: '15px', marginBottom: '8px' }}>
                  🎲 Spielplan generieren & Turnier starten
                </button>
                <p style={{ color: 'var(--pe-text-muted)', fontSize: '11px', textAlign: 'center', marginBottom: '16px' }}>
                  Boards werden per Los zugewiesen und der komplette Round-Robin Spielplan erstellt.
                </p>
                <button onClick={() => setWizardStep(3)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--pe-radius-md)', background: 'transparent', color: 'var(--pe-text-muted)', border: '1px solid var(--pe-border)', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer' }}>← Zurück zu Spielern</button>
              </div>
            );
          }

          // Phase A: Startmodus wählen
          return (
            <div>
              <div style={card}>
                <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>{players.length} Spieler bereit</p>
                <p style={{ color: 'var(--pe-text-muted)', fontSize: '12px', marginBottom: '20px' }}>Wähle den Start-Modus für das Turnier:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* Gruppenanzahl-Auswahl */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}>
                    <label htmlFor="numGroupsSelect" style={{ color: 'var(--pe-text-sub)', fontSize: '13px', fontFamily: 'var(--pe-font-body)', flexShrink: 0 }}>Anzahl Gruppen:</label>
                    <select
                      id="numGroupsSelect"
                      value={numGroups}
                      onChange={e => setNumGroups(Number(e.target.value))}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-bg-card)', color: 'var(--pe-text)', border: '1px solid var(--pe-border)', fontFamily: 'var(--pe-font-body)', fontSize: '14px', minHeight: '44px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235A7394' d='M6 8L1 3h10z'/%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '30px' }}
                    >
                      {[2, 3, 4, 6, 8].map(n => (
                        <option key={n} value={n}>{n} Gruppen</option>
                      ))}
                    </select>
                  </div>

                  {/* Option A: Gruppenphase */}
                  <button onClick={drawGroups} style={{ padding: '16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', boxShadow: '0 4px 14px rgba(0,184,255,0.3)', fontFamily: 'var(--pe-font-body)', cursor: 'pointer', minHeight: '64px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '28px', flexShrink: 0 }}>🏆</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Mit Gruppenphase starten</div>
                      <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '3px' }}>Automatische Gruppenauslosung → Round-Robin → KO-Runde</div>
                      <div style={{ fontSize: '11px', color: 'var(--pe-cyan-light)', marginTop: '2px' }}>Empfohlen ab 8 Spielern</div>
                    </div>
                  </button>

                  {/* Option B: Direkt KO */}
                  <button onClick={startTournament} style={{ padding: '16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-elevated)', color: 'var(--pe-text)', border: '1px solid var(--pe-border)', fontFamily: 'var(--pe-font-body)', cursor: 'pointer', minHeight: '64px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '28px', flexShrink: 0 }}>⚡</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Direkt KO-Bracket</div>
                      <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '3px' }}>Ohne Gruppenphase direkt ins K.O.-System</div>
                      <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '2px' }}>Schnellstart, ideal für kleine Turniere</div>
                    </div>
                  </button>
                </div>
              </div>
              <button onClick={() => setWizardStep(3)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--pe-radius-md)', background: 'transparent', color: 'var(--pe-text-muted)', border: '1px solid var(--pe-border)', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer' }}>← Zurück zu Spielern</button>
            </div>
          );
        })()}
      </div>
    );
  }

  // TOURNAMENT LIST VIEW (wizardStep === 0)
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Turniere</h2>
        <button onClick={() => { setWizardStep(1); setNewTournament(null); setCreateForm({ name: '', date: '', format: '501', checkout: 'double_out', use_seed: false }); }} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)' }}>
          + Neues Turnier
        </button>
      </div>

      {/* Inline error display for list view */}
      {wizardError && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: 'var(--pe-radius-md)', background: 'rgba(255,69,96,0.1)', border: '1px solid var(--pe-danger)', color: 'var(--pe-danger)', fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{wizardError}</span>
          <button onClick={() => setWizardError('')} style={{ background: 'none', border: 'none', color: 'var(--pe-danger)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>✕</button>
        </div>
      )}

      {/* Turnier-Liste */}
      {tournaments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <p style={{ color: 'var(--pe-text-muted)', fontSize: '16px', marginBottom: '16px' }}>Noch keine Turniere vorhanden.</p>
          <button onClick={() => setWizardStep(1)} style={{ padding: '14px 28px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '52px' }}>
            Erstes Turnier anlegen
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {tournaments.map(t => (
          <div key={t.id} onClick={() => setSelectedId(String(t.id))} style={{ padding: '16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-card)', border: `2px solid ${String(t.id) === String(selectedId) ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: 'var(--pe-text)', fontWeight: 'bold', fontSize: '16px' }}>{t.name}</div>
                {t.date && <div style={{ color: 'var(--pe-text-muted)', fontSize: '13px', marginTop: '2px' }}>{t.date}</div>}
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 'var(--pe-radius-md)', fontSize: '12px', fontWeight: 'bold', background: t.status === 'active' ? 'var(--pe-success)' : t.status === 'finished' ? 'var(--pe-border)' : 'var(--pe-blue-deep)', color: t.status === 'active' ? '#000' : 'var(--pe-text)' }}>
                {t.status === 'open' ? 'Offen' : t.status === 'active' ? 'Aktiv' : 'Beendet'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected tournament actions */}
      {selectedTournament && (
        <div>
          <h3 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '13px', marginBottom: '12px', textTransform: 'uppercase' }}>
            AKTIONEN: {selectedTournament.name}
          </h3>

          {/* Tournament info row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', color: 'var(--pe-text-sub)', fontSize: '12px', fontWeight: 'bold' }}>
              {selectedTournament.format || '501'}
            </span>
            <span style={{ padding: '4px 10px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', color: 'var(--pe-text-sub)', fontSize: '12px' }}>
              {selectedTournament.checkout === 'double_out' ? 'Double Out' : 'Single Out'}
            </span>
            {selectedTournament.use_seed ? (
              <span style={{ padding: '4px 10px', borderRadius: 'var(--pe-radius-sm)', background: 'rgba(0,229,160,0.12)', border: '1px solid var(--pe-success)', color: 'var(--pe-success)', fontSize: '12px', fontWeight: 'bold' }}>
                Seeding
              </span>
            ) : null}
            <span style={{ padding: '4px 10px', borderRadius: 'var(--pe-radius-sm)', fontSize: '12px', fontWeight: 'bold', background: selectedTournament.status === 'active' ? 'var(--pe-success)' : selectedTournament.status === 'finished' ? 'var(--pe-border)' : 'var(--pe-blue-deep)', color: selectedTournament.status === 'active' ? '#000' : 'var(--pe-text)' }}>
              {selectedTournament.status === 'open' ? 'Offen' : selectedTournament.status === 'active' ? 'Aktiv' : 'Beendet'}
            </span>
          </div>


          {/* Groups section — shown if group draw done or groups exist */}
          {(selectedTournament.group_draw_done || groups.length > 0) && groups.length > 0 && (
            <div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: 'var(--pe-radius-md)', padding: '14px', marginBottom: '12px' }}>
              <h4 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase' }}>Gruppen — Board Zuordnung</h4>
              {groups.map(g => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-bg-elevated)', marginBottom: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--pe-text)', fontWeight: 'bold', fontSize: '13px' }}>Gruppe {g.name}</span>
                    <span style={{ color: 'var(--pe-text-muted)', fontSize: '11px', marginLeft: '8px' }}>{(g.standings||[]).length} Spieler</span>
                  </div>
                  <select value={g.board_id || ''} onChange={e => assignGroupToBoard(g.id, e.target.value ? parseInt(e.target.value) : null)} style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', color: 'var(--pe-text)', borderRadius: 'var(--pe-radius-sm)', padding: '4px 8px', fontSize: '12px', fontFamily: 'var(--pe-font-body)', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235A7394' d='M6 8L1 3h10z'/%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '24px' }}>
                    <option value="">Kein Board</option>
                    {boards.map(b => <option key={b.id} value={b.id}>Board {b.number}{b.is_final ? ' ★' : ''}</option>)}
                  </select>
                </div>
              ))}
              {selectedTournament.status === 'open' && !selectedTournament.group_draw_done && (
                <button onClick={generateGroupSchedule} style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '44px', fontSize: '13px' }}>
                  Spielplan generieren
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {selectedTournament.status === 'open' && (
              <>
                <button onClick={() => { setWizardStep(3); }} style={{ padding: '12px 16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', minHeight: '48px', textAlign: 'left' }}>
                  Spieler verwalten →
                </button>
                <button onClick={() => { setWizardStep(4); }} style={{ padding: '12px 16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', minHeight: '48px', textAlign: 'left' }}>
                  Auslosung →
                </button>
              </>
            )}
            {selectedTournament.status === 'active' && !selectedTournament.locked && (
              <button onClick={lockTournament} style={{ padding: '12px 16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-warning)', color: '#000', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '48px' }}>
                Turnier abschließen
              </button>
            )}
            <button onClick={() => deleteTournament(selectedId)} style={{ padding: '12px 16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', border: '1px solid var(--pe-danger)', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '48px' }}>
              Turnier löschen
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Tab "System-Log" — Audit-Log im Terminal-Stil
const LOG_CATEGORY_COLORS = {
  tournament: 'var(--pe-blue-mid)',
  player:     'var(--pe-cyan-bright)',
  game:       'var(--pe-success)',
  config:     'var(--pe-warning)',
  user:       '#C850FF',
  board:      'var(--pe-cyan-light)',
  auth:       'var(--pe-text-muted)',
  system:     'var(--pe-danger)',
};

const LOG_ACTION_COLORS = {
  CREATE:    'var(--pe-success)',
  REGISTER:  'var(--pe-success)',
  START:     'var(--pe-success)',
  FINISH:    'var(--pe-blue-mid)',
  UPDATE:    'var(--pe-warning)',
  LOGIN:     'var(--pe-text-muted)',
  DELETE:    'var(--pe-danger)',
  RESET:     'var(--pe-danger)',
  WIPE:      'var(--pe-danger)',
  LOCK:      'var(--pe-warning)',
  LOG_CLEAR: 'var(--pe-danger)',
};

function LogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const load = () => {
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams({ limit: 300 });
    if (filterCat)    params.set('category', filterCat);
    if (filterAction) params.set('action', filterAction);
    api.get(`/admin/logs?${params}`)
      .then(data => { setLogs(data); setLoadError(''); })
      .catch(err => { setLogs([]); setLoadError(err.message || 'Fehler beim Laden'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterCat, filterAction]);
  useEffect(() => { const i = setInterval(load, 15000); return () => clearInterval(i); }, [filterCat, filterAction]);

  const categories = ['', 'tournament', 'player', 'game', 'config', 'user', 'board', 'auth', 'system'];
  const actions    = ['', 'CREATE', 'REGISTER', 'START', 'FINISH', 'UPDATE', 'DELETE', 'RESET', 'LOCK', 'WIPE', 'LOGIN', 'LOG_CLEAR'];

  const termStyle = {
    background: 'var(--pe-bg)',
    border: '1px solid var(--pe-border)',
    borderRadius: 'var(--pe-radius-md)',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '12px',
    padding: '12px',
    maxHeight: 'calc(100vh - 320px)',
    overflowY: 'auto',
    lineHeight: '1.7',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header + Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
          System-Log
          <span style={{ fontSize: '13px', color: 'var(--pe-text-muted)', marginLeft: '10px', fontWeight: 'normal' }}>
            Auto-Refresh 15s
          </span>
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '12px', minHeight: '36px' }}>
            {categories.map(c => <option key={c} value={c}>{c || 'Alle Kategorien'}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ ...selectStyle, padding: '6px 10px', fontSize: '12px', minHeight: '36px' }}>
            {actions.map(a => <option key={a} value={a}>{a || 'Alle Actions'}</option>)}
          </select>
          <button onClick={load} style={{ ...btnSmall, padding: '6px 14px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', minHeight: '36px' }}>
            ↻ Aktualisieren
          </button>
          <button onClick={() => window.open('/api/admin/logs/export', '_blank')} style={{ ...btnSmall, padding: '6px 14px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-cyan-bright)', border: '1px solid var(--pe-cyan-bright)', minHeight: '36px' }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div style={termStyle}>
        {loading && logs.length === 0 && (
          <span style={{ color: 'var(--pe-text-muted)' }}>Lade Log-Einträge...</span>
        )}
        {!loading && loadError && (
          <span style={{ color: 'var(--pe-danger)' }}>Fehler: {loadError} — Backend neu starten?</span>
        )}
        {!loading && !loadError && logs.length === 0 && (
          <span style={{ color: 'var(--pe-text-muted)' }}>Keine Log-Einträge gefunden.</span>
        )}
        {logs.map(entry => {
          const catColor    = LOG_CATEGORY_COLORS[entry.category] || 'var(--pe-text-muted)';
          const actionColor = LOG_ACTION_COLORS[entry.action]    || 'var(--pe-text)';
          const ts = entry.ts ? entry.ts.replace('T', ' ').slice(0, 19) : '';
          return (
            <div key={entry.id} style={{ marginBottom: '2px', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--pe-text-muted)', flexShrink: 0 }}>{ts}</span>
              <span style={{ color: 'var(--pe-text-sub)', flexShrink: 0 }}>[{entry.actor}/{entry.role}]</span>
              <span style={{ color: catColor, fontWeight: 'bold', flexShrink: 0 }}>{entry.category}</span>
              <span style={{ color: actionColor, fontWeight: 'bold', flexShrink: 0 }}>{entry.action}</span>
              <span style={{ color: 'var(--pe-text)' }}>{entry.detail}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--pe-text-muted)', textAlign: 'right' }}>
        {logs.length} Einträge
      </div>
    </div>
  );
}

// Tab "Einstellungen" — Theming + App-Daten (nur Admin)
function SettingsTab() {
  const { addToast } = useToastStore();
  const PRESETS = [
    { name: 'P Entertainment', color_primary: '#1A4FD6', color_mid: '#1E7FEB', color_accent: '#00B8FF', color_accent_light: '#5DD5FF', color_bg: '#090E1A', color_bg_card: '#101829', color_success: '#00E5A0', color_warning: '#FFB020', color_danger: '#FF4560' },
    { name: 'Lila Nacht',      color_primary: '#7B2FBF', color_mid: '#9B3FD6', color_accent: '#C850FF', color_accent_light: '#D87AFF', color_bg: '#0D0A1A', color_bg_card: '#160E28', color_success: '#00E5A0', color_warning: '#FFB020', color_danger: '#FF4560' },
    { name: 'Feuer',           color_primary: '#C42B14', color_mid: '#D94020', color_accent: '#FF6600', color_accent_light: '#FF9144', color_bg: '#120804', color_bg_card: '#1E0E07', color_success: '#00E5A0', color_warning: '#FFB020', color_danger: '#FF4560' },
    { name: 'Smaragd',         color_primary: '#0D7A3E', color_mid: '#119E4F', color_accent: '#00C464', color_accent_light: '#4FFFAA', color_bg: '#071A0E', color_bg_card: '#0E2918', color_success: '#00E5A0', color_warning: '#FFB020', color_danger: '#FF4560' },
    { name: 'Monochrom',       color_primary: '#374151', color_mid: '#4B5563', color_accent: '#9CA3AF', color_accent_light: '#D1D5DB', color_bg: '#0A0A0A', color_bg_card: '#141414', color_success: '#22C55E', color_warning: '#EAB308', color_danger: '#EF4444' },
  ];

  const COLOR_FIELDS = [
    { key: 'color_primary',      label: 'Primärfarbe (dunkel)' },
    { key: 'color_mid',          label: 'Primärfarbe (mittel)' },
    { key: 'color_accent',       label: 'Akzentfarbe (hell)' },
    { key: 'color_accent_light', label: 'Akzentfarbe (sehr hell)' },
    { key: 'color_bg',           label: 'Hintergrund' },
    { key: 'color_bg_card',      label: 'Karten-Hintergrund' },
    { key: 'color_success',      label: 'Erfolg (grün)' },
    { key: 'color_warning',      label: 'Warnung (gelb)' },
    { key: 'color_danger',       label: 'Gefahr (rot)' },
  ];

  const [cfg, setCfg] = useState({
    app_name: '', logo_url: '',
    color_primary: '#1A4FD6', color_mid: '#1E7FEB', color_accent: '#00B8FF', color_accent_light: '#5DD5FF',
    color_bg: '#090E1A', color_bg_card: '#101829',
    color_success: '#00E5A0', color_warning: '#FFB020', color_danger: '#FF4560',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/config').then(data => setCfg(prev => ({ ...prev, ...data }))).catch(() => {});
  }, []);

  const applyLive = (updated) => {
    const root = document.documentElement;
    const map = {
      color_primary: '--pe-blue-deep', color_mid: '--pe-blue-mid',
      color_accent: '--pe-cyan-bright', color_accent_light: '--pe-cyan-light',
      color_bg: '--pe-bg', color_bg_card: '--pe-bg-card',
      color_success: '--pe-success', color_warning: '--pe-warning', color_danger: '--pe-danger',
    };
    for (const [key, cssVar] of Object.entries(map)) {
      if (updated[key]) root.style.setProperty(cssVar, updated[key]);
    }
    root.style.setProperty('--pe-gradient',
      `linear-gradient(135deg, ${updated.color_accent_light || '#5DD5FF'}, ${updated.color_mid || '#1E7FEB'}, ${updated.color_primary || '#1A4FD6'})`
    );
    if (updated.app_name) document.title = updated.app_name;
  };

  const update = (key, val) => {
    const next = { ...cfg, [key]: val };
    setCfg(next);
    applyLive(next);
  };

  const applyPreset = (preset) => {
    const next = { ...cfg, ...preset };
    setCfg(next);
    applyLive(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/config', cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Speichern fehlgeschlagen' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Alle Einstellungen auf Standardwerte zurücksetzen?')) return;
    try {
      const defaults = await api.post('/config/reset', {});
      const next = { ...cfg, ...defaults };
      setCfg(next);
      applyLive(next);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Reset fehlgeschlagen' });
    }
  };

  const sectionStyle = { padding: '16px', borderRadius: 'var(--pe-radius-md)', background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' };
  const labelStyle = { fontSize: '12px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 'bold' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Einstellungen</h2>
      </div>

      {/* App-Daten */}
      <div style={sectionStyle}>
        <h3 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>App-Daten</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={labelStyle}>App-Name</div>
            <input type="text" value={cfg.app_name} onChange={e => update('app_name', e.target.value)} style={{ ...inputStyle, width: '100%', padding: '10px 12px' }} />
          </div>
          <div>
            <div style={labelStyle}>Logo URL</div>
            <input type="text" value={cfg.logo_url} onChange={e => update('logo_url', e.target.value)} placeholder="/logo.jpeg" style={{ ...inputStyle, width: '100%', padding: '10px 12px' }} />
          </div>
        </div>
      </div>

      {/* Gradient-Vorschau */}
      <div style={{ height: '36px', borderRadius: 'var(--pe-radius-md)', background: `linear-gradient(135deg, ${cfg.color_accent_light}, ${cfg.color_mid}, ${cfg.color_primary})` }} />

      {/* Theme-Vorlagen */}
      <div style={sectionStyle}>
        <h3 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Theme-Vorlagen</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
          {PRESETS.map(preset => (
            <button key={preset.name} onClick={() => applyPreset(preset)} style={{
              padding: '12px 8px', borderRadius: 'var(--pe-radius-md)', border: '2px solid transparent',
              background: preset.color_bg, cursor: 'pointer', fontFamily: 'var(--pe-font-body)',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = preset.color_accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ height: '6px', borderRadius: '3px', background: `linear-gradient(135deg, ${preset.color_accent_light}, ${preset.color_mid}, ${preset.color_primary})`, marginBottom: '8px' }} />
              <span style={{ color: preset.color_accent, fontSize: '12px', fontWeight: 'bold' }}>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Farb-Picker */}
      <div style={sectionStyle}>
        <h3 style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Farben anpassen</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: 'var(--pe-radius-sm)', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}>
              <input
                type="color"
                value={cfg[key] || '#000000'}
                onChange={e => update(key, e.target.value)}
                style={{ width: '44px', height: '44px', borderRadius: 'var(--pe-radius-sm)', border: 'none', cursor: 'pointer', background: 'none', padding: '2px', flexShrink: 0 }}
              />
              <div>
                <div style={{ color: 'var(--pe-text)', fontSize: '13px', fontWeight: 'bold' }}>{label}</div>
                <div style={{ color: 'var(--pe-text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>{cfg[key]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aktionen */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2, padding: '14px', borderRadius: 'var(--pe-radius-md)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: saved ? 'var(--pe-success)' : 'var(--pe-gradient)', color: saved ? '#000' : 'var(--pe-text)',
            fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '15px', minHeight: '52px',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Speichern...' : saved ? 'Gespeichert ✓' : 'Einstellungen speichern'}
        </button>
        <button
          onClick={handleReset}
          style={{
            flex: 1, padding: '14px', borderRadius: 'var(--pe-radius-md)', border: '1px solid var(--pe-border)', cursor: 'pointer',
            background: 'var(--pe-bg-elevated)', color: 'var(--pe-warning)',
            fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', minHeight: '52px',
          }}
        >
          Zurücksetzen
        </button>
      </div>
    </div>
  );
}

// NEU: Hilfe-Tab mit vollständiger Bedienungsanleitung
function HelpTab() {
  const card = { background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: 'var(--pe-radius-md)', padding: '16px', marginBottom: '12px' };
  const h2 = { color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '16px', marginBottom: '12px' };
  const h3 = { color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const p = { color: 'var(--pe-text-sub)', fontSize: '14px', lineHeight: '1.6', marginBottom: '6px' };
  const code = { background: 'var(--pe-bg-elevated)', color: 'var(--pe-cyan-light)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' };
  const badge = (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--pe-radius-md)', fontSize: '12px', fontWeight: 'bold', border: `1px solid ${color}`, color, marginRight: '6px' });
  const step = { display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' };
  const stepNum = { minWidth: '28px', height: '28px', borderRadius: '50%', background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '44px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Bedienungsanleitung</h2>
      </div>

      {/* ── DASHBOARDS & URLs ── */}
      <div style={card}>
        <h3 style={h3}>Dashboards &amp; URLs</h3>

        <div style={{ marginBottom: '12px' }}>
          <p style={{ ...p, marginBottom: '4px' }}><strong style={{ color: 'var(--pe-text)' }}>Öffentliche Startseite</strong></p>
          <p style={p}>Turnier-Übersicht, Spielerliste, Bracket und Scheibenstatus. Kein Login nötig.</p>
          <span style={code}>/</span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <p style={{ ...p, marginBottom: '4px' }}><strong style={{ color: 'var(--pe-text)' }}>Monitor-Ansicht (Beamer / TV)</strong></p>
          <p style={p}>Vollbild-Spielstand einer Scheibe — read-only, kein Login, geeignet für Großbildschirme.</p>
          <span style={code}>/board/1</span>
          <span style={{ color: 'var(--pe-text-muted)', fontSize: '13px', marginLeft: '8px' }}>/board/2, /board/3 …</span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <p style={{ ...p, marginBottom: '4px' }}><strong style={{ color: 'var(--pe-text)' }}>Schiedsrichter-Modus</strong></p>
          <p style={p}>Eingabe-Interface für Würfe. Login mit Rolle <span style={badge('var(--pe-warning)')}>referee</span> oder <span style={badge('var(--pe-danger)')}>admin</span> erforderlich.</p>
          <span style={code}>/referee/1</span>
          <span style={{ color: 'var(--pe-text-muted)', fontSize: '13px', marginLeft: '8px' }}>/referee/2 für Scheibe 2 usw.</span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <p style={{ ...p, marginBottom: '4px' }}><strong style={{ color: 'var(--pe-text)' }}>Gastronomie-Kasse</strong></p>
          <p style={p}>Bestellerfassung und Kassenmodus. Login mit Rolle <span style={badge('var(--pe-success)')}>gastronomy</span> oder <span style={badge('var(--pe-danger)')}>admin</span>.</p>
          <span style={code}>/gastronomy</span>
        </div>

        <div>
          <p style={{ ...p, marginBottom: '4px' }}><strong style={{ color: 'var(--pe-text)' }}>Admin Dashboard</strong></p>
          <p style={p}>Vollzugriff auf alle Einstellungen. Login mit Rolle <span style={badge('var(--pe-danger)')}>admin</span>.</p>
          <span style={code}>/admin</span>
        </div>
      </div>

      {/* ── ROLLEN ── */}
      <div style={card}>
        <h3 style={h3}>Rollen &amp; Berechtigungen</h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          {[
            { role: 'admin',      color: 'var(--pe-danger)',    desc: 'Vollzugriff — Turnierverwaltung, User anlegen, Einstellungen, Abrechnung, Mailing' },
            { role: 'director',   color: 'var(--pe-blue-mid)',  desc: 'Turnierleitung — Spielplan, Boards, Auslosung, Spielerverwaltung (kein User/Gastro/Einstellungen-Zugriff)' },
            { role: 'referee',    color: 'var(--pe-warning)',   desc: 'Schiedsrichter — darf Würfe eingeben und Spiele leiten (/referee/:boardId)' },
            { role: 'gastronomy', color: 'var(--pe-success)',   desc: 'Bar / Küche — Bestellungen erfassen und abrechnen (/gastronomy)' },
          ].map(({ role, color, desc }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={badge(color)}>{role}</span>
              <span style={{ ...p, marginBottom: 0 }}>{desc}</span>
            </div>
          ))}
        </div>
        <p style={{ ...p, marginTop: '10px', color: 'var(--pe-text-muted)' }}>
          User anlegen: Tab <strong style={{ color: 'var(--pe-text-sub)' }}>User</strong> → "+ Neu"
        </p>
      </div>

      {/* ── TURNIER VORBEREITUNG ── */}
      <div style={card}>
        <h3 style={h3}>Turnier-Vorbereitung — Schritt für Schritt</h3>
        {[
          { n: 1, title: 'Boards anlegen', desc: 'Tab "Boards" → "+ Neu" → Nummer (1, 2, 3 …) und optionalen Namen eingeben. Für jede physische Dartscheibe einen Board anlegen.' },
          { n: 2, title: 'Mitarbeiter anlegen', desc: 'Tab "User" → "+ Neu" → Schiedsrichter mit Rolle "referee", Barpersonal mit "gastronomy" anlegen. Ohne User-Accounts können Schiedsrichter nicht einloggen.' },
          { n: 3, title: 'Produkte anlegen', desc: 'Tab "Gastro" → "+ Neu" → Alle Speisen und Getränke mit Preis eintragen. Erst danach kann die Kasse Bestellungen aufnehmen.' },
          { n: 4, title: 'Turnier erstellen', desc: 'Tab "Turniere" → Turnier auswählen oder neu anlegen. Format (501/301), Checkout (Single/Double Out) und Anzahl der Legs je Runde konfigurieren.' },
          { n: 5, title: 'Spieler anmelden', desc: 'Tab "Spieler" → Turnier auswählen → "+ Neu" → Namen eingeben. Optional: Walk-On Song URL für Viertelfinale+. Mindestens 4 Spieler für Gruppenphase.' },
          { n: 6, title: 'Gruppen auslosen', desc: 'Tab "Turniere" → "Gruppen auslosen". Automatische Serpentinen-Verteilung: 4–7 Spieler = 2 Gruppen, 8–15 = 4 Gruppen, 16+ = 8 Gruppen.' },
          { n: 7, title: 'Turnier starten', desc: 'Turnier auf "aktiv" setzen. Schiedsrichter loggen sich unter /referee/:boardId ein und können sofort Würfe eingeben.' },
          { n: 8, title: 'KO-Bracket generieren', desc: 'Nach Abschluss der Gruppenphase: Tab "Turniere" → "KO-Bracket generieren". Gruppensieger und -zweite ziehen ins KO-System ein.' },
          { n: 9, title: 'Turnier abschließen', desc: 'Tab "Turniere" → "Turnier abschließen" (rote Taste). Danach ist das Turnier gesperrt (nur noch lesbar). Mailing-Zusammenfassung danach unter "Mailing" versenden.' },
        ].map(({ n, title, desc }) => (
          <div key={n} style={step}>
            <div style={stepNum}>{n}</div>
            <div>
              <p style={{ ...p, marginBottom: '2px', color: 'var(--pe-text)', fontWeight: 'bold' }}>{title}</p>
              <p style={{ ...p, marginBottom: 0 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── SCHIEDSRICHTER ── */}
      <div style={card}>
        <h3 style={h3}>Schiedsrichter-Interface</h3>
        <p style={p}>URL: <span style={code}>/referee/[Board-Nummer]</span> — Login mit Schiedsrichter-Account.</p>
        <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
          {[
            ['Modifier wählen', 'Single / Double / Triple — vor der Zahl drücken. Standard ist Single.'],
            ['Zahl tippen', '[1]–[20] für das Feld. BULL = 25 Pkt, D-BULL = 50 Pkt, MISS = 0 Pkt.'],
            ['Runde bestätigen', 'Nach 3 Würfen automatisch oder manuell mit "Runde bestätigen".'],
            ['Undo', 'Bis zu 9 Würfe zurück über den ↩ Button neben jedem Wurf.'],
          ].map(([action, desc]) => (
            <div key={action} style={{ display: 'flex', gap: '10px' }}>
              <span style={{ ...p, marginBottom: 0, minWidth: '150px', color: 'var(--pe-text)', fontWeight: 'bold' }}>{action}</span>
              <span style={{ ...p, marginBottom: 0 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── GASTRONOMIE ── */}
      <div style={card}>
        <h3 style={h3}>Gastronomie-Kasse</h3>
        <p style={p}>URL: <span style={code}>/gastronomy</span> — Login mit Gastronomy-Account.</p>
        <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
          {[
            ['NFC-Scan', 'NFC-Chip oder QR-Code scannen → Gast wird geladen.'],
            ['Bestellung', 'Produkt-Buttons antippen → Warenkorb → "Bestellen" zum Speichern.'],
            ['Kassenmodus', 'Oben auf "Kasse" umschalten → alle offenen Bestellungen je Gast sehen.'],
            ['Abrechnen', '"Jetzt abrechnen" beim Gast → Posten werden auf bezahlt gesetzt, Quittung erscheint.'],
          ].map(([action, desc]) => (
            <div key={action} style={{ display: 'flex', gap: '10px' }}>
              <span style={{ ...p, marginBottom: 0, minWidth: '120px', color: 'var(--pe-text)', fontWeight: 'bold' }}>{action}</span>
              <span style={{ ...p, marginBottom: 0 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── NFC ── */}
      <div style={card}>
        <h3 style={h3}>NFC &amp; Gäste</h3>
        <p style={p}>NFC-Tags werden über <span style={code}>/nfc-scan</span> oder direkt in der Gastronomie-Kasse gescannt. Jeder Tag entspricht einem Gast-Konto. NFC funktioniert nativ in Chrome auf Android.</p>
        <p style={{ ...p, color: 'var(--pe-text-muted)', marginBottom: 0 }}>Ohne NFC-Hardware: Gäste manuell über die Gastro-Suche laden oder QR-Code verwenden.</p>
      </div>

      {/* ── MAILING ── */}
      <div style={card}>
        <h3 style={h3}>Mailing (Post-Event)</h3>
        <p style={p}>Tab <strong style={{ color: 'var(--pe-text-sub)' }}>Mailing</strong> → Templates anlegen → Test-Mail senden → nach dem Event "Event-Zusammenfassung senden".</p>
        <p style={{ ...p, color: 'var(--pe-text-muted)', marginBottom: 0 }}>Ohne SMTP-Konfiguration (MAIL_HOST in <span style={code}>/backend/.env</span>) werden Mails nur in der Server-Konsole geloggt (dry-run).</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { token } = useStore();

  if (!token || !isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }

  const payload = parseJwt(token);
  if (!['admin', 'director'].includes(payload?.role)) {
    return <Navigate to="/login" replace />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const token = useStore(s => s.token);

  const payload = parseJwt(token);
  const userRole = payload?.role ?? null;
  const visibleTabs = ALL_TABS.filter(t => userRole && t.roles.includes(userRole));

  const [searchParams, setSearchParams] = useSearchParams();
  // Keep role-based guard: if URL names a tab not visible for this role, fall back to 'overview'
  const activeTab = visibleTabs.find(t => t.id === (searchParams.get('tab') || 'overview'))
    ? (searchParams.get('tab') || 'overview')
    : 'overview';
  const setActiveTab = (tab) => setSearchParams({ tab }, { replace: true });

  return (
    <div style={{ fontFamily: 'var(--pe-font-body)', padding: '16px', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 200px)' }}>
      {activeTab === 'overview'    && <OverviewTab />}
      {activeTab === 'director'    && <TournamentDirectorTab />}
      {activeTab === 'tournaments' && <TournamentExtendedTab />}
      {activeTab === 'players'     && <PlayersTab />}
      {activeTab === 'boards'      && <BoardsTab />}
      {activeTab === 'users'       && <UsersTab />}
      {activeTab === 'gastro'      && <GastroAdminTab />}
      {activeTab === 'mailing'     && <MailingTab />}
      {activeTab === 'settings'    && <SettingsTab />}
      {activeTab === 'log'         && <LogTab />}
      {activeTab === 'help'        && <HelpTab />}
    </div>
  );
}
