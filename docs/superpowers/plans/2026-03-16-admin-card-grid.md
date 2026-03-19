# Admin Card Grid Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive 2/3/4-column card grid to AdminPage's UsersTab, PlayersTab, and BoardsTab on desktop (≥768px), leaving the mobile list layout completely unchanged.

**Architecture:** Each tab function gets two inline hook calls (`useState` + `useEffect`) that track viewport width via `window.matchMedia`. The existing mobile list render is wrapped in a conditional (`isDesktop ? <grid> : <existing>`). No new files, no API changes, no state changes — render output only.

**Tech Stack:** React 18, inline styles, PE Corporate Design tokens, `window.matchMedia` for responsive breakpoint.

**Spec:** `docs/superpowers/specs/2026-03-16-admin-card-grid-design.md`

---

## Chunk 1: BoardsTab desktop card grid

### Task 1: BoardsTab — add isDesktop hook + 4-col card grid

**Files:**
- Modify: `frontend/src/pages/AdminPage.jsx:104–230` (BoardsTab function)

**Context:**
- `BoardsTab` starts at line 104, its render return starts at line 145
- The boards list currently renders at lines 186–226 (`<div className="space-y-3">...`)
- No accordion — buttons are always visible on each card
- `loadBoards()` and `addToast` are already in scope

- [ ] **Step 1: Start the dev server to enable browser verification**

```bash
cd /home/moritzwolf/dartsturnier/frontend && npm run dev
```

Expected: Vite dev server running, URL shown (typically `http://localhost:5173`)

- [ ] **Step 2: Add isDesktop hook calls inside BoardsTab**

In `frontend/src/pages/AdminPage.jsx`, add these two hook calls directly after the existing `useEffect` at line 127, before `const handleCreate`:

Find this exact line:
```jsx
  useEffect(() => { loadBoards(); }, [selectedTournamentId]);
```

Replace with:
```jsx
  useEffect(() => { loadBoards(); }, [selectedTournamentId]);

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
```

- [ ] **Step 3: Replace the boards list with a conditional desktop/mobile render**

Find this exact block (lines 186–226):
```jsx
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
```

Replace with:
```jsx
      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxWidth: '900px' }}>
          {boards.map((b) => {
            const isFinalDisabled = !b.is_final && boards.some(x => x.is_final && x.id !== b.id);
            return (
              <div key={b.id} style={{ background: 'var(--pe-bg-card)', border: b.is_final ? '1px solid var(--pe-warning)' : '1px solid var(--pe-border)', borderRadius: '10px', padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '22px' }}>🎯</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--pe-text)' }}>Board {b.number}</div>
                {b.name && <div style={{ fontSize: '10px', color: 'var(--pe-text-muted)' }}>{b.name}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}>
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '8px', background: b.current_game_id ? 'rgba(0,229,160,0.15)' : 'rgba(90,115,148,0.15)', color: b.current_game_id ? 'var(--pe-success)' : 'var(--pe-text-muted)', border: b.current_game_id ? '1px solid rgba(0,229,160,0.3)' : '1px solid var(--pe-border)' }}>
                    {b.current_game_id ? '● Aktiv' : 'Frei'}
                  </span>
                  {b.is_final && (
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '8px', background: 'rgba(255,176,32,0.15)', color: 'var(--pe-warning)', border: '1px solid rgba(255,176,32,0.3)' }}>★ Final</span>
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
                    style={{ flex: 1, padding: '4px 6px', borderRadius: '6px', border: 'none', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold', fontSize: '10px', cursor: isFinalDisabled ? 'not-allowed' : 'pointer', background: b.is_final ? 'var(--pe-warning)' : 'var(--pe-bg-elevated)', color: b.is_final ? '#000' : 'var(--pe-text-sub)', opacity: isFinalDisabled ? 0.4 : 1 }}
                  >
                    {b.is_final ? '★ Final' : 'Als Final markieren'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Board ${b.number} löschen?`)) return;
                      try { await api.del(`/boards/${b.id}`); loadBoards(); }
                      catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                    }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)' }}
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
```

- [ ] **Step 4: Visually verify in browser**

Open browser at `http://localhost:5173`, log in as admin, go to Admin → Boards tab.

**Desktop (≥768px — default browser window):**
- [ ] Boards appear as a 4-column card grid, each card with 🎯 emoji, Board number, optional name, status badge, Final/Löschen buttons
- [ ] Final board shows warning border + solid yellow "★ Final" button with black text
- [ ] Active board shows green "● Aktiv" badge
- [ ] "Als Final markieren" is disabled/faded when another board already has `is_final`
- [ ] Empty state shows "Keine Boards für dieses Turnier." spanning full width

**Mobile (resize browser to <768px or use DevTools mobile mode):**
- [ ] Boards revert to original space-y-3 list — pixel-identical to before

- [ ] **Step 5: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/pages/AdminPage.jsx
git commit -m "feat: add desktop card grid to BoardsTab (4-col, no accordion)"
```

---

## Chunk 2: UsersTab desktop card grid

### Task 2: UsersTab — add isDesktop hook + ROLE_BADGE_STYLES + 2-col card grid

**Files:**
- Modify: `frontend/src/pages/AdminPage.jsx:487–630` (UsersTab function)

**Context:**
- `ROLE_COLORS` and `ROLE_LABELS` are module-level constants (lines 32, 485) — already in scope
- The existing mobile list is `<div className="space-y-2">` at line 565–627
- Accordion is controlled by `editId` state + `startEdit(u)` / `setEditId(null)` / `handleSaveEdit(userId)`
- `handleDelete(userId)` uses `confirm()` then `api.del('/users/:id')`
- Role badge needs rgba colors — use inline `ROLE_BADGE_STYLES` const defined inside UsersTab

- [ ] **Step 1: Add ROLE_BADGE_STYLES const and isDesktop hook calls inside UsersTab**

Find the line after `const canSubmit = ...` (line 530):
```jsx
  const canSubmit = createForm.username.trim() && createForm.password && createForm.vorname.trim() && createForm.nickname.trim() && createForm.nachname.trim();
```

Replace with:
```jsx
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
```

- [ ] **Step 2: Replace the users list with a conditional desktop/mobile render**

Find this exact block starting at line 565:
```jsx
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--pe-bg-card)', border: `1px solid ${editId === u.id ? 'var(--pe-blue-mid)' : 'var(--pe-border)'}` }}>
```

The entire block ends at line 627:
```jsx
        {users.length === 0 && <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Keine User</p>}
      </div>
```

Replace the entire `<div className="space-y-2">...</div>` block (lines 565–627) with:

```jsx
      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxWidth: '900px' }}>
          {users.map((u) => {
            const badge = ROLE_BADGE_STYLES[u.role] || { color: 'var(--pe-text-muted)', bg: 'rgba(90,115,148,0.15)', border: 'var(--pe-border)' };
            const isExpanded = editId === u.id;
            return (
              <div key={u.id} style={{ background: 'var(--pe-bg-card)', border: `1px solid ${isExpanded ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`, borderRadius: '10px', padding: '12px', opacity: u.active ? 1 : 0.5 }}>
                {/* Card header row */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {/* Avatar */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: u.active ? 'var(--pe-gradient)' : 'var(--pe-bg-elevated)', border: u.active ? 'none' : '1px solid var(--pe-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', color: u.active ? '#fff' : 'var(--pe-text-muted)' }}>
                    {(u.vorname || u.username || '?')[0].toUpperCase()}
                  </div>
                  {/* Name + handle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--pe-text)' }}>{u.display_name || u.username}</div>
                    {u.display_name && <div style={{ fontSize: '10px', color: 'var(--pe-text-muted)' }}>@{u.username}</div>}
                  </div>
                  {/* Role badge */}
                  <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '10px', flexShrink: 0, whiteSpace: 'nowrap', color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {/* Edit / Close button */}
                  <button
                    onClick={() => isExpanded ? setEditId(null) : startEdit(u)}
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: isExpanded ? `1px solid var(--pe-cyan-bright)` : '1px solid var(--pe-border)', background: isExpanded ? 'rgba(0,184,255,0.1)' : 'var(--pe-bg-elevated)', color: isExpanded ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)', cursor: 'pointer', flexShrink: 0, fontFamily: 'Verdana, Geneva, sans-serif' }}
                  >
                    {isExpanded ? '✕' : '✏️'}
                  </button>
                  {/* Deactivate button (collapsed only, active users only) */}
                  {!isExpanded && u.active && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--pe-border)', background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', cursor: 'pointer', flexShrink: 0, fontFamily: 'Verdana, Geneva, sans-serif' }}
                    >
                      Deaktivieren
                    </button>
                  )}
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
                      <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ ...inputStyle, padding: '7px 10px' }}>
                        <option value="director">Turnierleitung</option>
                        <option value="referee">Schiedsrichter</option>
                        <option value="gastronomy">Gastronomie</option>
                        <option value="admin">Admin</option>
                      </select>
                      <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Neues Passwort" style={{ ...inputStyle, padding: '7px 10px', boxSizing: 'border-box' }} />
                    </div>
                    <button onClick={() => handleSaveEdit(u.id)} style={{ background: 'var(--pe-gradient)', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', width: '100%' }}>
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
                  <span className="text-xs px-2 py-1 rounded-full font-bold flex-shrink-0" style={{ color: ROLE_COLORS[u.role] || 'var(--pe-text-muted)', border: `1px solid ${ROLE_COLORS[u.role] || 'var(--pe-border)'}` }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => editId === u.id ? setEditId(null) : startEdit(u)}
                    style={{ ...btnSmall, background: editId === u.id ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)', color: editId === u.id ? '#fff' : 'var(--pe-text-sub)', padding: '5px 12px' }}
                  >
                    {editId === u.id ? 'Abbrechen' : 'Bearbeiten'}
                  </button>
                  {u.active && (
                    <button onClick={() => handleDelete(u.id)} style={{ ...btnSmall, background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', padding: '5px 12px' }}>
                      Deaktivieren
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
                      <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '10px 12px' }}>
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
                  <button onClick={() => handleSaveEdit(u.id)} style={{ background: 'var(--pe-gradient)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold', cursor: 'pointer', width: '100%', minHeight: '44px' }}>
                    Änderungen speichern
                  </button>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Keine User</p>}
        </div>
      )}
```

- [ ] **Step 3: Visually verify in browser**

Go to Admin → User tab.

**Desktop (≥768px):**
- [ ] Users appear as a 2-column card grid with avatar circle (initial letter), name, @handle, role badge pill
- [ ] Admin role badge is red/danger; director is blue; referee is orange/warning; gastronomy is green
- [ ] Inactive users render at 50% opacity with grey avatar (no gradient)
- [ ] Clicking ✏️ expands that card in-place with cyan border; shows 3-col name row, 2-col role/password row, Speichern button
- [ ] Only one card expanded at a time — clicking another ✏️ should close previous (existing `setEditId` behavior)
- [ ] ✕ button closes accordion
- [ ] "Deaktivieren" button visible next to ✏️ only for active users; clicking shows confirm dialog
- [ ] Clicking Speichern calls the API and closes accordion

**Mobile (<768px):**
- [ ] Original list restored — identical to before this PR

- [ ] **Step 4: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/pages/AdminPage.jsx
git commit -m "feat: add desktop card grid to UsersTab (2-col, inline accordion)"
```

---

## Chunk 3: PlayersTab desktop card grid

### Task 3: PlayersTab — add isDesktop hook + 3-col card grid with inline accordion

**Files:**
- Modify: `frontend/src/pages/AdminPage.jsx:242–482` (PlayersTab function)

**Context:**
- `PlayersTab` uses `editingPlayer` state (not `editId`) — accordion controlled by `setEditingPlayer({...})` / `setEditingPlayer(null)`
- `handleEdit` is a form submit handler (`e.preventDefault()`) — call via `onSubmit={handleEdit}` on the inline form
- The existing floating edit form at lines 400–436 (`{editingPlayer && <form>...}`) must be suppressed in desktop mode to avoid rendering twice
- Walk-on status helper: inline function `walkonStatusDisplay(p)` defined inside the desktop grid render
- `isActive` (line 247: `const isActive = tournamentStatus === 'active'`) is already in scope

- [ ] **Step 1: Add isDesktop hook calls inside PlayersTab**

Find this line in PlayersTab (after the `walkonStatuses` state):
```jsx
  const [walkonStatuses, setWalkonStatuses] = useState({}); // { [playerId]: status string }
  const [showForm, setShowForm] = useState(false);
```

Replace with:
```jsx
  const [walkonStatuses, setWalkonStatuses] = useState({}); // { [playerId]: status string }
  const [showForm, setShowForm] = useState(false);

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
```

- [ ] **Step 2: Suppress the floating edit form in desktop mode**

Find:
```jsx
      {editingPlayer && (
        <form onSubmit={handleEdit} className="p-4 rounded-xl mb-4 space-y-3" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-cyan-bright)' }}>
```

Replace with:
```jsx
      {editingPlayer && !isDesktop && (
        <form onSubmit={handleEdit} className="p-4 rounded-xl mb-4 space-y-3" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-cyan-bright)' }}>
```

- [ ] **Step 3: Replace the players list with a conditional desktop/mobile render**

Find this exact block (line 439–479):
```jsx
      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.id} className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
            <div>
              <span className="font-bold" style={{ color: 'var(--pe-text)' }}>{p.name}</span>
              {(p.walkon_url || p.walkon_youtube) && (
                <WalkonBadge status={walkonStatuses[p.id]} />
              )}
              <span className="ml-3 text-xs" style={{ color: 'var(--pe-text-muted)' }}>Seed: {p.seed || '—'}</span>
            </div>
            <div className="flex gap-2">
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
              <button
                disabled={isActive}
                onClick={async () => {
                  if (!confirm(`${p.name} löschen?`)) return;
                  try { await api.del(`/tournaments/${selectedTournament}/players/${p.id}`); await loadPlayers(); }
                  catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                }}
                style={{ ...btnSmall, padding: '4px 12px', background: 'var(--pe-bg-elevated)', color: isActive ? 'var(--pe-text-muted)' : 'var(--pe-danger)', minHeight: '36px', cursor: isActive ? 'not-allowed' : 'pointer', opacity: isActive ? 0.4 : 1 }}
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
        {players.length === 0 && <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Keine Spieler</p>}
      </div>
```

Replace with:
```jsx
      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '1100px' }}>
          {players.map((p) => {
            const isExpanded = editingPlayer?.id === p.id;
            const hasWalkon = p.walkon_url || p.walkon_youtube;
            const walkonStatus = walkonStatuses[p.id];
            let walkonText = '♪ —';
            let walkonColor = 'var(--pe-text-muted)';
            if (hasWalkon) {
              if (walkonStatus === 'ready')                              { walkonText = '♪ ready';  walkonColor = 'var(--pe-success)'; }
              else if (walkonStatus === 'downloading' || walkonStatus === 'pending') { walkonText = '⏳ lädt';  walkonColor = 'var(--pe-warning)'; }
              else if (walkonStatus === 'error')                         { walkonText = '✗ Fehler'; walkonColor = 'var(--pe-danger)'; }
              else                                                        { walkonText = '♪ —';     walkonColor = 'var(--pe-text-muted)'; }
            }
            return (
              <div key={p.id} style={{ background: 'var(--pe-bg-card)', border: `1px solid ${isExpanded ? 'var(--pe-cyan-bright)' : 'var(--pe-border)'}`, borderRadius: '10px', padding: '12px' }}>
                {/* Collapsed header — always visible */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Seed circle */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', color: p.seed ? 'var(--pe-cyan-bright)' : 'var(--pe-text-muted)' }}>
                    {p.seed ? `#${p.seed}` : '—'}
                  </div>
                  {/* Name + walk-on status */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--pe-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: walkonColor, marginTop: '2px' }}>{walkonText}</div>
                  </div>
                  {/* Edit / Close button */}
                  <button
                    onClick={() => isExpanded
                      ? setEditingPlayer(null)
                      : setEditingPlayer({ id: p.id, vorname: p.vorname || '', nickname: p.nickname || '', nachname: p.nachname || '', walk_on_song: p.walkon_url || p.walkon_youtube || '', walkon_start: p.walkon_start ?? 0, walkon_duration: p.walkon_duration ?? 30 })
                    }
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: isExpanded ? '1px solid var(--pe-cyan-bright)' : '1px solid var(--pe-border)', background: isExpanded ? 'rgba(0,184,255,0.1)' : 'var(--pe-bg-elevated)', color: isExpanded ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)', cursor: 'pointer', flexShrink: 0, fontFamily: 'Verdana, Geneva, sans-serif' }}
                  >
                    {isExpanded ? '✕' : '✏️'}
                  </button>
                </div>
                {/* Expanded accordion form */}
                {isExpanded && (
                  <form onSubmit={handleEdit} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                    <button
                      type="button"
                      disabled={isActive}
                      onClick={async () => {
                        if (!confirm(`${p.name} löschen?`)) return;
                        try { await api.del(`/tournaments/${selectedTournament}/players/${p.id}`); await loadPlayers(); }
                        catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                      }}
                      style={{ padding: '6px', borderRadius: '6px', border: 'none', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold', fontSize: '10px', cursor: isActive ? 'not-allowed' : 'pointer', background: 'var(--pe-bg-elevated)', color: isActive ? 'var(--pe-text-muted)' : 'var(--pe-danger)', opacity: isActive ? 0.4 : 1 }}
                    >
                      Löschen
                    </button>
                    <button type="submit" style={{ background: 'var(--pe-gradient)', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' }}>
                      Speichern
                    </button>
                  </form>
                )}
              </div>
            );
          })}
          {players.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--pe-text-muted)', fontSize: '13px', padding: '24px' }}>Keine Spieler</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
              <div>
                <span className="font-bold" style={{ color: 'var(--pe-text)' }}>{p.name}</span>
                {(p.walkon_url || p.walkon_youtube) && (
                  <WalkonBadge status={walkonStatuses[p.id]} />
                )}
                <span className="ml-3 text-xs" style={{ color: 'var(--pe-text-muted)' }}>Seed: {p.seed || '—'}</span>
              </div>
              <div className="flex gap-2">
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
                <button
                  disabled={isActive}
                  onClick={async () => {
                    if (!confirm(`${p.name} löschen?`)) return;
                    try { await api.del(`/tournaments/${selectedTournament}/players/${p.id}`); await loadPlayers(); }
                    catch (err) { addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' }); }
                  }}
                  style={{ ...btnSmall, padding: '4px 12px', background: 'var(--pe-bg-elevated)', color: isActive ? 'var(--pe-text-muted)' : 'var(--pe-danger)', minHeight: '36px', cursor: isActive ? 'not-allowed' : 'pointer', opacity: isActive ? 0.4 : 1 }}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
          {players.length === 0 && <p className="text-sm" style={{ color: 'var(--pe-text-muted)' }}>Keine Spieler</p>}
        </div>
      )}
```

- [ ] **Step 4: Visually verify in browser**

Go to Admin → Spieler tab, select a tournament.

**Desktop (≥768px):**
- [ ] Players appear as a 3-column card grid with seed circle (#N or — muted), player name (truncated), walk-on status line
- [ ] Walk-on status: `♪ ready` in green, `⏳ lädt` in orange, `✗ Fehler` in red, `♪ —` in muted for no URL
- [ ] Clicking ✏️ expands the card inline: shows 2-col Vorname/Nachname, full-width Nickname, full-width Walk-On URL, conditional Start/Duration row, Löschen + Speichern buttons
- [ ] Löschen button is disabled/faded when tournament is active
- [ ] Speichern submits the form and calls handleEdit — accordion closes after save
- [ ] ✕ button closes accordion without saving
- [ ] The old floating edit form (above the list) is NOT visible in desktop mode
- [ ] Only one card expanded at a time

**Mobile (<768px):**
- [ ] Original list + floating edit form behavior — identical to before

- [ ] **Step 5: Commit**

```bash
cd /home/moritzwolf/dartsturnier
git add frontend/src/pages/AdminPage.jsx
git commit -m "feat: add desktop card grid to PlayersTab (3-col, inline accordion)"
```
