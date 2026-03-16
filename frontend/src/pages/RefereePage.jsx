import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToastStore } from '../store/toasts';
import { useStore } from '../store';

const NUMBERS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
const MOD = { Single: 'S', Double: 'D', Triple: 'T' };

function segmentScore(seg) {
  if (!seg || seg === 'MISS' || seg === 'BUST') return 0;
  if (seg === 'BULL') return 25;
  if (seg === 'D-BULL') return 50;
  const n = parseInt(seg.slice(1));
  if (seg[0] === 'S') return n;
  if (seg[0] === 'D') return n * 2;
  if (seg[0] === 'T') return n * 3;
  return 0;
}

function useTabletLandscape() {
  const check = () => window.innerWidth >= 768 && window.innerWidth > window.innerHeight;
  const [is, setIs] = useState(check);
  useEffect(() => {
    const h = () => setIs(check());
    window.addEventListener('resize', h);
    window.addEventListener('orientationchange', () => setTimeout(h, 200));
    return () => window.removeEventListener('resize', h);
  }, []);
  return is;
}

// Emergency logout — fixed ⚙ button, visible in full-screen scoring view (no AppShell)
function EmergencyLogout() {
  const { logout } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/referee');
  };

  return (
    <div ref={ref} style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 200 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menü öffnen"
        style={{
          width: '44px', height: '44px',
          borderRadius: '50%',
          background: 'var(--pe-bg-elevated)',
          border: '1px solid var(--pe-border)',
          color: 'var(--pe-text-muted)',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}
      >
        ⚙
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--pe-bg-elevated)',
          border: '1px solid var(--pe-border)',
          borderRadius: '12px',
          padding: '8px',
          minWidth: '140px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', minHeight: '44px',
              padding: '10px 12px',
              background: 'none',
              border: '1px solid var(--pe-border)',
              borderRadius: '8px',
              color: 'var(--pe-danger)',
              cursor: 'pointer',
              fontSize: '13px', fontWeight: 'bold',
              fontFamily: 'Verdana, Geneva, sans-serif',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,96,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────
const btn = (extra = {}) => ({
  fontFamily: 'Verdana, Geneva, sans-serif',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  border: '1px solid var(--pe-border)',
  ...extra,
});

// ── Bulloff Panel ──────────────────────────────────────────────────────────
function BulloffPanel({ gameId, player1, player2, onDone, isTablet }) {
  const { addToast } = useToastStore();
  const [p1score, setP1score] = useState(null);
  const [p2score, setP2score] = useState(null);
  const [missWinner, setMissWinner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tieMsg, setTieMsg] = useState('');

  const bothMiss = p1score === 0 && p2score === 0;
  const canSubmit = p1score !== null && p2score !== null && (!bothMiss || missWinner !== null);
  const reset = (msg = '') => { setP1score(null); setP2score(null); setMissWinner(null); setTieMsg(msg); };

  const submit = async () => {
    setSaving(true);
    try {
      const body = { player1_score: p1score, player2_score: p2score };
      if (bothMiss && missWinner) body.winner_id = missWinner;
      const res = await api.post(`/games/${gameId}/bulloff`, body);
      if (res.status === 'bulloff') reset('Gleichstand — erneut werfen!');
      else onDone();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Fehler' }); }
    finally { setSaving(false); }
  };

  const OPTS = [
    { label: 'MISS', val: 0 },
    { label: 'BULL', sub: '25', val: 25 },
    { label: 'D-Bull', sub: '50', val: 50 },
  ];

  const btnH = isTablet ? '64px' : '56px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: isTablet ? '20px' : '16px', margin: '0 0 4px' }}>AUSBULLEN</p>
        <p style={{ color: 'var(--pe-text-muted)', fontSize: '13px', margin: 0 }}>Höchster Wert gewinnt. Bei zwei MISS entscheidet die Nähe.</p>
      </div>

      {tieMsg && (
        <div style={{ background: 'rgba(255,176,32,0.15)', border: '1px solid var(--pe-warning)', borderRadius: '10px', padding: '10px', textAlign: 'center', color: 'var(--pe-warning)', fontWeight: 'bold', fontSize: '14px' }}>
          {tieMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
        {[
          { name: player1?.name, val: p1score, set: setP1score },
          { name: player2?.name, val: p2score, set: setP2score },
        ].map(({ name, val, set }, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: isTablet ? '15px' : '13px', textAlign: 'center', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
            {OPTS.map(({ label, sub, val: v }) => (
              <button key={v} onClick={() => { set(v); setMissWinner(null); }}
                style={btn({ minHeight: btnH, background: val === v ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)', color: 'var(--pe-text)', fontSize: isTablet ? '17px' : '15px', borderColor: val === v ? 'var(--pe-cyan-bright)' : 'var(--pe-border)', width: '100%' })}>
                {label}{sub ? <span style={{ fontSize: '11px', opacity: 0.7 }}> ({sub})</span> : null}
              </button>
            ))}
          </div>
        ))}
      </div>

      {bothMiss && (
        <div style={{ background: 'rgba(255,176,32,0.1)', border: '1px solid var(--pe-warning)', borderRadius: '10px', padding: '12px' }}>
          <p style={{ color: 'var(--pe-warning)', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 10px' }}>Beide MISS — wer war näher am Bull?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[player1, player2].map(p => (
              <button key={p.id} onClick={() => setMissWinner(p.id)}
                style={btn({ minHeight: '56px', background: missWinner === p.id ? 'var(--pe-warning)' : 'var(--pe-bg-card)', color: missWinner === p.id ? '#000' : 'var(--pe-text)', fontSize: '14px', borderColor: missWinner === p.id ? 'var(--pe-warning)' : 'var(--pe-border)', width: '100%' })}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={submit} disabled={saving || !canSubmit}
        style={btn({ minHeight: isTablet ? '68px' : '56px', background: canSubmit ? 'var(--pe-gradient)' : 'var(--pe-bg-elevated)', color: '#fff', border: 'none', fontSize: isTablet ? '18px' : '16px', opacity: (saving || !canSubmit) ? 0.5 : 1, width: '100%' })}>
        {saving ? 'Speichern...' : 'Bulloff bestätigen'}
      </button>
    </div>
  );
}

// ── Dart Number Pad ────────────────────────────────────────────────────────
function DartPad({ modifier, setModifier, onThrow, disabled, isTablet }) {
  const btnH = isTablet ? '58px' : '54px';
  const numFs = isTablet ? '20px' : '17px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isTablet ? '10px' : '8px' }}>
      {/* Modifier */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {['Single', 'Double', 'Triple'].map(m => (
          <button key={m} onClick={() => setModifier(m)}
            style={btn({ minHeight: isTablet ? '52px' : '48px', background: modifier === m ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)', color: modifier === m ? 'var(--pe-text)' : 'var(--pe-text-sub)', borderColor: modifier === m ? 'var(--pe-blue-mid)' : 'var(--pe-border)', fontSize: isTablet ? '15px' : '14px' })}>
            {m}
          </button>
        ))}
      </div>

      {/* Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isTablet ? '7px' : '5px' }}>
        {NUMBERS.map(n => (
          <button key={n} onClick={() => onThrow(`${MOD[modifier]}${n}`)} disabled={disabled}
            style={btn({ minHeight: btnH, background: 'var(--pe-bg-elevated)', color: disabled ? 'var(--pe-text-muted)' : 'var(--pe-text)', fontSize: numFs, opacity: disabled ? 0.35 : 1 })}>
            {n}
          </button>
        ))}
      </div>

      {/* Special */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {[
          { seg: 'BULL', label: 'BULL', sub: '25', color: 'var(--pe-success)' },
          { seg: 'D-BULL', label: 'D-BULL', sub: '50', color: 'var(--pe-danger)' },
          { seg: 'MISS', label: 'MISS', sub: '0', color: 'var(--pe-text-muted)' },
        ].map(({ seg, label, sub, color }) => (
          <button key={seg} onClick={() => onThrow(seg)} disabled={disabled}
            style={btn({ minHeight: btnH, background: 'var(--pe-bg-elevated)', color, fontSize: isTablet ? '15px' : '13px', opacity: disabled ? 0.35 : 1 })}>
            {label}<br /><span style={{ fontSize: '11px', opacity: 0.7 }}>({sub})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Current Round Throws ───────────────────────────────────────────────────
// throws      = current_round_throws (may be empty if a new round just started)
// prevThrow   = last throw from the previous round (for cross-round undo)
function RoundThrows({ throws, prevThrow, onUndo, disabled, isTablet }) {
  // If the current round is empty, show the previous round's last throw so it
  // can still be undone (cross-round undo).
  const showPrev = throws.length === 0 && prevThrow;
  const displayThrows = showPrev ? [] : throws;
  const total = displayThrows.reduce((s, t) => s + segmentScore(t.segment), 0);
  return (
    <div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: '12px', padding: isTablet ? '14px' : '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: 'var(--pe-text-muted)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {showPrev ? 'Letzter Wurf (vorige Runde)' : 'Aktuelle Runde'}
        </span>
        {!showPrev && <span style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '16px' }}>Σ {total}</span>}
      </div>

      {showPrev ? (
        // Show only the last throw from the previous round with a prominent undo button
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--pe-bg-elevated)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--pe-warning)' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 'bold', color: prevThrow.segment === 'BUST' ? 'var(--pe-danger)' : 'var(--pe-text)', fontSize: '16px' }}>{prevThrow.segment}</span>
            <span style={{ fontSize: '12px', color: 'var(--pe-text-muted)', marginLeft: '8px' }}>{segmentScore(prevThrow.segment)} Pkt</span>
          </div>
          <button onClick={() => onUndo(prevThrow.id)} disabled={disabled}
            style={btn({ padding: '6px 14px', background: 'rgba(255,176,32,0.15)', color: 'var(--pe-warning)', border: '1px solid var(--pe-warning)', fontSize: '13px', opacity: disabled ? 0.5 : 1 })}>
            ↩ Rückgängig
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0, 1, 2].map(i => {
            const t = displayThrows[i];
            return (
              <div key={i} style={{ flex: 1, background: 'var(--pe-bg-elevated)', borderRadius: '8px', padding: '8px', minHeight: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', border: `1px solid ${t ? 'var(--pe-blue-mid)' : 'var(--pe-border)'}` }}>
                <span style={{ fontSize: '10px', color: 'var(--pe-text-muted)', textTransform: 'uppercase' }}>Wurf {i + 1}</span>
                {t ? (
                  <>
                    <span style={{ fontWeight: 'bold', color: t.segment === 'BUST' ? 'var(--pe-danger)' : 'var(--pe-text)', fontSize: '14px' }}>{t.segment}</span>
                    <span style={{ fontSize: '11px', color: 'var(--pe-text-muted)' }}>{segmentScore(t.segment)} Pkt</span>
                    <button onClick={() => onUndo(t.id)} disabled={disabled}
                      style={btn({ padding: '1px 8px', background: 'transparent', color: 'var(--pe-warning)', fontSize: '14px', border: 'none', opacity: disabled ? 0.5 : 1, minHeight: 'unset' })}>
                      ↩
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--pe-text-muted)', fontSize: '18px' }}>—</span>
                    <button disabled aria-hidden="true"
                      style={btn({ padding: '1px 8px', background: 'transparent', color: 'transparent', fontSize: '14px', border: 'none', minHeight: 'unset', visibility: 'hidden', cursor: 'default' })}>
                      ↩
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Last Throws Row ─────────────────────────────────────────────────────────
function LastThrows({ throws = [], isTablet }) {
  const slots = [0, 1, 2].map(i => throws[throws.length - 3 + i] || null);
  return (
    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '6px' }}>
      {slots.map((t, i) => {
        const isBust = t?.segment === 'BUST';
        const score = t ? segmentScore(t.segment) : null;
        return (
          <div key={i} style={{
            flex: 1,
            background: t ? (isBust ? 'rgba(255,69,96,0.15)' : 'var(--pe-bg-elevated)') : 'rgba(255,255,255,0.04)',
            border: `1px solid ${t ? (isBust ? 'var(--pe-danger)' : 'var(--pe-border)') : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '6px',
            padding: '4px 2px',
            textAlign: 'center',
            minWidth: 0,
          }}>
            {t ? (
              <>
                <div style={{ fontSize: isTablet ? '11px' : '10px', fontWeight: 'bold', color: isBust ? 'var(--pe-danger)' : 'var(--pe-text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.segment}
                </div>
                <div style={{ fontSize: '10px', color: isBust ? 'var(--pe-danger)' : 'var(--pe-text-muted)', lineHeight: 1 }}>
                  {isBust ? '—' : `+${score}`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.12)', lineHeight: 1.8 }}>·</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Walk-On Play Button ─────────────────────────────────────────────────────
function WalkonPlayButton({ playerId }) {
  const [audio, setAudio] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(null); // null=loading, true/false

  useEffect(() => {
    api.get(`/walkon/${playerId}/status`)
      .then(s => setAvailable(s.job?.status === 'ready' || !!s.walkon_file))
      .catch(() => setAvailable(false));
  }, [playerId]);

  if (!available) return null;

  const handlePlay = () => {
    if (playing && audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
      setPlaying(false);
      return;
    }
    const a = new Audio(`/api/walkon/${playerId}/audio`);
    a.onended = () => { setPlaying(false); setAudio(null); };
    a.onerror = () => { setPlaying(false); setAudio(null); };
    a.play().catch(() => { setPlaying(false); setAudio(null); });
    setAudio(a);
    setPlaying(true);
  };

  return (
    <button
      onClick={handlePlay}
      style={{
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '11px',
        fontWeight: 'bold',
        borderRadius: '8px',
        cursor: 'pointer',
        border: `1px solid ${playing ? 'var(--pe-warning)' : 'var(--pe-success)'}`,
        background: playing ? 'rgba(255,176,32,0.15)' : 'rgba(0,229,160,0.12)',
        color: playing ? 'var(--pe-warning)' : 'var(--pe-success)',
        padding: '4px 10px',
        minHeight: '44px',
        marginTop: '6px',
        width: '100%',
      }}
    >
      {playing ? '◼ Stop' : '▶ Walk-On'}
    </button>
  );
}

// ── Scoreboard ─────────────────────────────────────────────────────────────
function Scoreboard({ player1, player2, currentThrowerId, bullWinnerId, game, isTablet }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isTablet ? '10px' : '8px' }}>
      {[player1, player2].map((p) => {
        const isActive = currentThrowerId === p.id;
        const isBullWinner = bullWinnerId === p.id;
        return (
          <div key={p.id} style={{
            padding: isTablet ? '16px 12px' : '12px 10px',
            borderRadius: '14px',
            textAlign: 'center',
            background: isActive ? 'rgba(26,79,214,0.35)' : 'var(--pe-bg-card)',
            border: `2px solid ${isActive ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`,
            transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ color: isActive ? 'var(--pe-text)' : 'var(--pe-text-sub)', fontWeight: 'bold', fontSize: isTablet ? '14px' : '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{p.name}</span>
              {isBullWinner && <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', background: 'var(--pe-warning)', color: '#000', fontWeight: 'bold' }}>Bull</span>}
              {isActive && <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '6px', background: 'var(--pe-success)', color: '#000', fontWeight: 'bold' }}>▶</span>}
            </div>
            <WalkonPlayButton playerId={p.id} />
            <div style={{ fontSize: isTablet ? '58px' : '46px', fontWeight: 'bold', color: 'var(--pe-text)', lineHeight: 1, margin: '4px 0' }}>{p.remaining}</div>
            {p.checkout_suggestions?.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--pe-success)', marginBottom: '2px' }}>→ {p.checkout_suggestions[0]}</div>
            )}
            <LastThrows throws={p.last_throws || []} isTablet={isTablet} />
            <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '4px' }}>{p.throws_count} Würfe</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Game Queue ──────────────────────────────────────────────────────────────
function GameQueue({ boardId, currentGameId, canSwitch, onSelect, onSkip, isTablet }) {
  const { addToast } = useToastStore();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/boards/${boardId}/available-games`);
      setGames(Array.isArray(data) ? data.filter(g => g.id !== currentGameId) : []);
    } catch { setGames([]); }
    finally { setLoading(false); }
  }, [boardId, currentGameId]);

  useEffect(() => { load(); }, [load]);

  const handleSkip = async (gameId) => {
    try {
      await api.post(`/games/${gameId}/skip`);
      await load();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Fehler beim Überspringen' }); }
  };

  if (loading) return <p style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>Lade...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: 'var(--pe-text-muted)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Warteschlange ({games.length})
        </span>
        <button onClick={load} style={btn({ padding: '2px 8px', background: 'transparent', border: 'none', color: 'var(--pe-text-muted)', fontSize: '14px', fontWeight: 'normal', minHeight: 'unset' })}>↻</button>
      </div>
      {games.length === 0 ? (
        <p style={{ color: 'var(--pe-text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>Keine weiteren Partien</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {games.map((g, idx) => (
            <div key={g.id} style={{ background: 'var(--pe-bg-elevated)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--pe-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '10px', color: 'var(--pe-text-muted)', display: 'block' }}>#{idx + 1}</span>
                <span style={{ fontSize: '12px', color: 'var(--pe-text)', fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.player1_name}</span>
                <span style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block' }}>vs {g.player2_name}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => handleSkip(g.id)}
                  style={btn({ padding: '4px 8px', background: 'transparent', color: 'var(--pe-warning)', border: '1px solid var(--pe-warning)', fontSize: '11px', minHeight: '30px', whiteSpace: 'nowrap' })}>
                  Überspr.
                </button>
                {canSwitch && (
                  <button onClick={() => onSelect(g.id)}
                    style={btn({ padding: '6px 12px', background: 'var(--pe-blue-deep)', color: '#fff', border: 'none', fontSize: '12px', minHeight: '36px', whiteSpace: 'nowrap' })}>
                    Starten ▶
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Next Game Preview ──────────────────────────────────────────────────────
function NextGamePreview({ boardId, currentGameId, isTablet }) {
  const [nextGame, setNextGame] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/boards/${boardId}/next-game`);
      // Only show if it's not the current active game
      if (data && data.game_id !== currentGameId) {
        setNextGame(data);
      } else {
        setNextGame(null);
      }
    } catch {
      setNextGame(null);
    }
  }, [boardId, currentGameId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  if (!nextGame) return null;

  return (
    <div style={{
      background: 'var(--pe-bg-card)',
      border: '1px solid var(--pe-border)',
      borderRadius: '12px',
      padding: isTablet ? '14px' : '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--pe-warning)' }}>
          Nächstes Spiel
        </span>
      </div>
      <div style={{ background: 'var(--pe-bg-elevated)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--pe-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: isTablet ? '15px' : '14px', fontWeight: 'bold', color: 'var(--pe-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextGame.player1_name || 'TBD'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--pe-text-muted)', flexShrink: 0 }}>vs</span>
          <span style={{ fontSize: isTablet ? '15px' : '14px', fontWeight: 'bold', color: 'var(--pe-text)', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextGame.player2_name || 'TBD'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Game Info Bar ──────────────────────────────────────────────────────────
function GameInfoBar({ game, isTablet }) {
  const tiles = [
    { label: 'LEGS', value: `Best of ${game.legs || 1}`, color: 'var(--pe-cyan-bright)' },
    { label: 'MODUS', value: game.checkout === 'double_out' ? 'Double Out' : 'Single Out', color: game.checkout === 'double_out' ? 'var(--pe-warning)' : 'var(--pe-success)' },
    { label: 'START', value: game.start_score, color: 'var(--pe-text)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
      {tiles.map(({ label, value, color }) => (
        <div key={label} style={{ textAlign: 'center', padding: isTablet ? '8px 4px' : '6px 4px', borderRadius: '8px', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}>
          <span style={{ fontSize: '10px', color: 'var(--pe-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
          <span style={{ fontSize: isTablet ? '14px' : '13px', fontWeight: 'bold', color }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// Compute the last undoable throw from the previous round (cross-round undo).
// Used when current_round_throws is empty so the last throw of the just-finished
// round can still be undone.
function getPrevRoundLastThrow(liveData) {
  if (!liveData) return null;
  const { current_round_throws = [], player1, player2 } = liveData;
  if (current_round_throws.length > 0) return null; // current round has throws — no need
  const candidates = [
    ...(player1?.last_throws || []),
    ...(player2?.last_throws || []),
  ];
  if (candidates.length === 0) return null;
  // Pick the throw with the highest id (most recently added)
  return candidates.reduce((best, t) => (!best || t.id > best.id ? t : best), null);
}

// ══════════════════════════════════════════════════════════════════════════
// ── TABLET LAYOUT ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function TabletLayout({ boardId, boardNumber, selectedGameId, setSelectedGameId, liveData, fetchLive, modifier, setModifier, submitting, throwSegment, undoThrow }) {
  const { addToast } = useToastStore();
  const { game, player1, player2, current_round_throws = [] } = liveData || {};
  const currentThrowerId = game?.current_turn || game?.bull_winner_id;

  const canSwitch = !game || game.status === 'finished' || game.status === 'pending';
  const canReset = game && (game.status === 'bulloff');

  const handleSelect = (gameId) => {
    setSelectedGameId(gameId);
    setModifier('Single');
  };

  const handleSkipCurrent = async () => {
    if (!game) return;
    try {
      await api.post(`/games/${game.id}/reset`);
      setSelectedGameId(null);
    } catch (err) { addToast({ type: 'error', message: err.message || 'Fehler' }); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Verdana, Geneva, sans-serif', background: 'var(--pe-bg)' }}>
      <EmergencyLogout />

      {/* ── LEFT PANEL ── */}
      <div style={{ width: '360px', minWidth: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--pe-bg-card)', borderRight: '1px solid var(--pe-border)', overflow: 'hidden', overflowX: 'hidden' }}>

        {/* Board indicator */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--pe-border)', flexShrink: 0 }}>
          <span style={{ fontWeight: 'bold', color: 'var(--pe-cyan-bright)', fontSize: '14px' }}>🎯 Board {boardNumber}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* No game — show full picker */}
          {!selectedGameId && (
            <div>
              <p style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '15px', marginBottom: '10px' }}>Partie wählen</p>
              <GameQueue boardId={boardId} currentGameId={null} canSwitch={true} onSelect={handleSelect} isTablet={true} />
            </div>
          )}

          {/* Game loaded */}
          {game && (
            <>
              <GameInfoBar game={game} isTablet={true} />

              {game.status !== 'finished' && (
                <Scoreboard player1={player1} player2={player2} currentThrowerId={currentThrowerId} bullWinnerId={game.bull_winner_id} game={game} isTablet={true} />
              )}

              {game.status === 'finished' && (
                <div style={{ textAlign: 'center', padding: '20px', borderRadius: '12px', border: '2px solid var(--pe-success)', background: 'rgba(0,229,160,0.08)' }}>
                  <p style={{ color: 'var(--pe-success)', fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px' }}>Spiel beendet!</p>
                  <p style={{ color: 'var(--pe-text)', fontSize: '15px', margin: 0 }}>
                    Gewinner: {(game.winner_id === player1?.id ? player1 : player2)?.name || '—'}
                  </p>
                </div>
              )}

              {game.status === 'active' && (
                <RoundThrows throws={current_round_throws} prevThrow={getPrevRoundLastThrow(liveData)} onUndo={undoThrow} disabled={submitting} isTablet={true} />
              )}

              {/* Nächstes Spiel Preview */}
              {(game.status === 'active' || game.status === 'bulloff') && (
                <NextGamePreview boardId={boardId} currentGameId={game.id} isTablet={true} />
              )}

              {/* Skip / Nächste Partie */}
              <div style={{ borderTop: '1px solid var(--pe-border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {canReset && (
                  <button onClick={handleSkipCurrent}
                    style={btn({ minHeight: '36px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-warning)', fontSize: '12px', border: '1px solid var(--pe-warning)' })}>
                    ↩ Bulloff zurücksetzen
                  </button>
                )}
                {(game.status === 'finished' || canSwitch) && (
                  <button onClick={() => { setSelectedGameId(null); setModifier('Single'); }}
                    style={btn({ minHeight: '36px', background: 'var(--pe-blue-deep)', color: '#fff', fontSize: '13px', border: 'none' })}>
                    Andere Partie wählen
                  </button>
                )}
              </div>
            </>
          )}

          {/* Queue — always visible when game is active/bulloff */}
          {game && game.status !== 'finished' && (
            <div style={{ borderTop: '1px solid var(--pe-border)', paddingTop: '10px' }}>
              <GameQueue boardId={boardId} currentGameId={selectedGameId} canSwitch={canSwitch} onSelect={handleSelect} isTablet={true} />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px', gap: '12px' }}>

        {/* No game selected */}
        {!selectedGameId && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--pe-text-muted)' }}>
              <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🎯</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--pe-text-sub)' }}>Partie aus der Liste wählen</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {selectedGameId && !game && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pe-text-sub)' }}>Lade Partie...</div>
        )}

        {/* Bulloff phase */}
        {game && (game.status === 'pending' || game.status === 'bulloff') && player1 && player2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <BulloffPanel gameId={game.id} player1={player1} player2={player2} onDone={fetchLive} isTablet={true} />
          </div>
        )}

        {/* Active game input */}
        {game?.status === 'active' && player1 && player2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Active player banner */}
            <div style={{ background: 'rgba(26,79,214,0.25)', border: '1px solid var(--pe-blue-mid)', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>▶</span>
              <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--pe-text)' }}>
                {(currentThrowerId === player1.id ? player1 : player2)?.name}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--pe-text-muted)' }}>
                Rest: <strong style={{ color: 'var(--pe-text)', fontSize: '16px' }}>
                  {currentThrowerId === player1.id ? player1.remaining : player2.remaining}
                </strong>
              </span>
            </div>

            <DartPad
              modifier={modifier}
              setModifier={setModifier}
              onThrow={throwSegment}
              disabled={submitting || current_round_throws.length >= 3}
              isTablet={true}
            />

            {/* Confirm */}
            <button
              onClick={fetchLive}
              disabled={current_round_throws.length === 0 || submitting}
              style={btn({
                minHeight: '60px',
                background: current_round_throws.length === 3 ? 'var(--pe-gradient)' : 'var(--pe-bg-elevated)',
                color: '#fff',
                border: current_round_throws.length === 3 ? 'none' : '1px solid var(--pe-border)',
                fontSize: '17px',
                opacity: current_round_throws.length === 0 ? 0.4 : 1,
              })}>
              Runde abschließen ({current_round_throws.length}/3)
            </button>
          </div>
        )}

        {/* Finished */}
        {game?.status === 'finished' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🏆</p>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--pe-success)', marginBottom: '8px' }}>Spiel beendet!</p>
              <p style={{ color: 'var(--pe-text-sub)', fontSize: '16px' }}>Nächste Partie aus der Liste wählen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── PHONE LAYOUT ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function PhoneLayout({ boardId, boardNumber, selectedGameId, setSelectedGameId, liveData, fetchLive, modifier, setModifier, submitting, throwSegment, undoThrow }) {
  const { game, player1, player2, current_round_throws = [] } = liveData || {};
  const currentThrowerId = game?.current_turn || game?.bull_winner_id;

  const goToPicker = () => { setSelectedGameId(null); setModifier('Single'); };

  return (
    <div style={{ minHeight: '100vh', padding: '12px', maxWidth: '480px', margin: '0 auto', fontFamily: 'Verdana, Geneva, sans-serif', boxSizing: 'border-box' }}>
      <EmergencyLogout />

      {/* Board indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ color: 'var(--pe-cyan-bright)', fontSize: '14px', fontWeight: 'bold' }}>🎯 Board {boardNumber}</span>
        {selectedGameId && game && game.status !== 'active' && (
          <button onClick={goToPicker} style={btn({ padding: '5px 10px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-warning)', fontSize: '11px', minHeight: '30px', borderColor: 'var(--pe-warning)' })}>
            Andere Partie
          </button>
        )}
      </div>

      {/* No game — picker */}
      {!selectedGameId && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ color: 'var(--pe-cyan-bright)', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Partie wählen</p>
          </div>
          <GameQueue boardId={boardId} currentGameId={null} canSwitch={true} onSelect={id => { setSelectedGameId(id); setModifier('Single'); }} isTablet={false} />
        </div>
      )}

      {selectedGameId && !game && (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--pe-text-sub)' }}>Lade Partie...</div>
      )}

      {/* Finished */}
      {game?.status === 'finished' && (
        <div>
          <div style={{ textAlign: 'center', padding: '32px', borderRadius: '16px', background: 'var(--pe-bg-card)', border: '2px solid var(--pe-success)', marginBottom: '12px' }}>
            <p style={{ color: 'var(--pe-success)', fontWeight: 'bold', fontSize: '20px', marginBottom: '8px' }}>Spiel beendet!</p>
            <p style={{ color: 'var(--pe-text)', fontSize: '16px' }}>
              Gewinner: {(game.winner_id === player1?.id ? player1 : player2)?.name || '—'}
            </p>
          </div>
          <button onClick={goToPicker} style={btn({ width: '100%', minHeight: '56px', background: 'var(--pe-blue-deep)', color: '#fff', border: 'none', fontSize: '16px' })}>
            Nächste Partie wählen
          </button>
        </div>
      )}

      {/* Bulloff */}
      {game && (game.status === 'pending' || game.status === 'bulloff') && player1 && player2 && (
        <>
          <GameInfoBar game={game} isTablet={false} />
          <div style={{ marginTop: '12px' }}>
            <BulloffPanel gameId={game.id} player1={player1} player2={player2} onDone={fetchLive} isTablet={false} />
          </div>
        </>
      )}

      {/* Active game */}
      {game?.status === 'active' && player1 && player2 && (
        <>
          <GameInfoBar game={game} isTablet={false} />
          <div style={{ marginTop: '10px', marginBottom: '10px' }}>
            <Scoreboard player1={player1} player2={player2} currentThrowerId={currentThrowerId} bullWinnerId={game.bull_winner_id} game={game} isTablet={false} />
          </div>

          {/* ── Permanent status bar — bull winner + active player ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '44px',
            minHeight: '44px',
            flexShrink: 0,
            background: 'var(--pe-bg-elevated)',
            border: '1px solid var(--pe-border)',
            borderRadius: '10px',
            padding: '0 12px',
            marginBottom: '10px',
            fontFamily: 'Verdana, Geneva, sans-serif',
            boxSizing: 'border-box',
          }}>
            <span style={{ fontSize: '12px', color: game.bull_winner_id ? 'var(--pe-warning)' : 'var(--pe-text-muted)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>
              🎯 {game.bull_winner_id
                ? (game.bull_winner_id === player1.id ? player1.name : player2.name)
                : <span style={{ color: 'var(--pe-text-muted)', fontWeight: 'normal' }}>—</span>}
            </span>
            <span style={{ fontSize: '12px', color: currentThrowerId ? 'var(--pe-success)' : 'var(--pe-text-muted)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%', textAlign: 'right' }}>
              {currentThrowerId
                ? <>▶ {currentThrowerId === player1.id ? player1.name : player2.name}</>
                : <span style={{ color: 'var(--pe-text-muted)', fontWeight: 'normal' }}>▶ —</span>}
            </span>
          </div>

          {/* ── Round throws — fixed min-height so DartPad never jumps ── */}
          <div style={{ minHeight: '120px', marginBottom: '10px' }}>
            <RoundThrows throws={current_round_throws} prevThrow={getPrevRoundLastThrow(liveData)} onUndo={undoThrow} disabled={submitting} isTablet={false} />
          </div>

          <DartPad
            modifier={modifier}
            setModifier={setModifier}
            onThrow={throwSegment}
            disabled={submitting || current_round_throws.length >= 3}
            isTablet={false}
          />

          <button
            onClick={fetchLive}
            disabled={current_round_throws.length === 0 || submitting}
            style={btn({
              width: '100%', minHeight: '58px', marginTop: '8px',
              background: current_round_throws.length === 3 ? 'var(--pe-gradient)' : 'var(--pe-bg-card)',
              color: '#fff', border: `1px solid ${current_round_throws.length === 3 ? 'transparent' : 'var(--pe-border)'}`,
              fontSize: '16px', opacity: current_round_throws.length === 0 ? 0.4 : 1,
            })}>
            Runde abschließen ({current_round_throws.length}/3)
          </button>

          {/* Nächstes Spiel Preview */}
          <div style={{ marginTop: '12px' }}>
            <NextGamePreview boardId={boardId} currentGameId={game.id} isTablet={false} />
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
export default function RefereePage() {
  const { addToast } = useToastStore();
  const { logout, token } = useStore();

  if (!token) return <Navigate to="/referee" replace />;
  const { boardId: boardNumber } = useParams();
  const [resolvedBoardId, setResolvedBoardId] = useState(null);
  const [boardNotFound, setBoardNotFound] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [modifier, setModifier] = useState('Single');
  const [submitting, setSubmitting] = useState(false);
  const isTablet = useTabletLandscape();

  // Resolve board number → internal board ID for the active tournament
  useEffect(() => {
    setResolvedBoardId(null);
    setBoardNotFound(false);
    api.get(`/boards/by-number/${boardNumber}`)
      .then(board => setResolvedBoardId(board.id))
      .catch(() => setBoardNotFound(true));
  }, [boardNumber]);

  useEffect(() => {
    if (!resolvedBoardId) return;
    api.get(`/boards/${resolvedBoardId}/current-game`).then(data => {
      if (data?.game_id) setSelectedGameId(data.game_id);
    }).catch(() => {});
  }, [resolvedBoardId]);

  const fetchLive = useCallback(async () => {
    if (!selectedGameId) return;
    try {
      const live = await api.get(`/games/${selectedGameId}/live`);
      setLiveData(live);
    } catch { setLiveData(null); }
  }, [selectedGameId]);

  useEffect(() => {
    if (selectedGameId) fetchLive();
    else setLiveData(null);
  }, [selectedGameId, fetchLive]);

  useEffect(() => {
    if (!liveData || liveData.game?.status === 'finished') return;
    const iv = setInterval(fetchLive, 5000);
    return () => clearInterval(iv);
  }, [liveData?.game?.status, fetchLive]);

  const throwSegment = async (segment) => {
    const { game, player1, player2 } = liveData;
    const throwerId = game.current_turn || game.bull_winner_id || player1.id;
    if (submitting || (liveData.current_round_throws || []).length >= 3) return;

    // Issue #5: Detect potential checkout and ask for confirmation
    const thrower = throwerId === player1.id ? player1 : player2;
    const throwScore = segmentScore(segment);
    if (throwScore > 0 && thrower && thrower.remaining - throwScore === 0) {
      const confirmed = window.confirm(
        `Spiel beenden?\n\nLetzter Wurf: ${segment} (${throwScore} Pkt)\n${thrower.name} gewinnt!\n\nBestätigen zum Abschließen, Abbrechen zum Verwerfen.`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      await api.post(`/games/${game.id}/throw-segment`, { segment, player_id: throwerId });
      await fetchLive();
      setModifier('Single');
    } catch (err) { addToast({ type: 'error', message: err.message || 'Fehler' }); }
    finally { setSubmitting(false); }
  };

  const undoThrow = async (throwId) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.del(`/games/${liveData.game.id}/throw/${throwId}`);
      await fetchLive();
    } catch (err) { addToast({ type: 'error', message: err.message || 'Fehler' }); }
    finally { setSubmitting(false); }
  };

  if (boardNotFound || !resolvedBoardId) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--pe-bg)', display: 'flex', flexDirection: 'column', fontFamily: 'Verdana, Geneva, sans-serif' }}>
        {/* Content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          {boardNotFound ? (
            <div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-danger)', borderRadius: '14px', padding: '32px 24px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎯</div>
              <div style={{ color: 'var(--pe-danger)', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>Board {boardNumber} nicht gefunden</div>
              <div style={{ color: 'var(--pe-text-sub)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                Kein aktives Turnier mit Board {boardNumber} gefunden.<br />Bitte den Turnierleiter kontaktieren.
              </div>
              <button onClick={() => { setBoardNotFound(false); api.get(`/boards/by-number/${boardNumber}`).then(b => setResolvedBoardId(b.id)).catch(() => setBoardNotFound(true)); }}
                style={{ background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', color: 'var(--pe-text)', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold' }}>
                ↻ Erneut versuchen
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--pe-text-muted)', fontSize: '15px' }}>Board wird geladen…</div>
          )}
        </div>
      </div>
    );
  }

  const shared = {
    boardId: resolvedBoardId, boardNumber,
    selectedGameId, setSelectedGameId,
    liveData, fetchLive,
    modifier, setModifier,
    submitting, throwSegment, undoThrow,
  };

  return isTablet
    ? <TabletLayout {...shared} />
    : <PhoneLayout {...shared} />;
}
