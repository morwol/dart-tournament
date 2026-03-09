import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', format: '501', checkout: 'double_out' });
  const [submitting, setSubmitting] = useState(false);

  const loadTournaments = () => {
    api.get('/tournaments').then(setTournaments).catch(() => {});
  };

  useEffect(() => { loadTournaments(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/tournaments', form);
      setForm({ name: '', date: '', format: '501', checkout: 'double_out' });
      setShowForm(false);
      loadTournaments();
    } catch (err) {
      alert(err.message || 'Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await api.put(`/tournaments/${id}/start`);
      loadTournaments();
    } catch (err) {
      alert(err.message || 'Fehler beim Starten');
    }
  };

  const inputStyle = {
    background: 'var(--pe-bg-card)',
    border: '1px solid var(--pe-border)',
    color: 'var(--pe-text)',
    minHeight: '48px',
    fontFamily: 'Verdana, Geneva, sans-serif',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--pe-cyan-bright)' }}>Turniere</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'Verdana, Geneva, sans-serif' }}
        >
          {showForm ? 'Abbrechen' : '+ Neu'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl mb-6 space-y-3" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Turniername"
            className="w-full p-3 rounded-lg outline-none"
            style={inputStyle}
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full p-3 rounded-lg outline-none"
            style={inputStyle}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="p-3 rounded-lg outline-none"
              style={inputStyle}
            >
              <option value="501">501</option>
              <option value="301">301</option>
            </select>
            <select
              value={form.checkout}
              onChange={(e) => setForm({ ...form, checkout: e.target.value })}
              className="p-3 rounded-lg outline-none"
              style={inputStyle}
            >
              <option value="double_out">Double Out</option>
              <option value="single_out">Single Out</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting || !form.name.trim()}
            className="w-full py-3 rounded-lg font-bold disabled:opacity-50"
            style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '48px', fontFamily: 'Verdana, Geneva, sans-serif' }}
          >
            Turnier erstellen
          </button>
        </form>
      )}

      <div className="space-y-3">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="p-4 rounded-xl"
            style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--pe-text)' }}>{t.name}</h3>
                <p className="text-sm" style={{ color: 'var(--pe-text-sub)' }}>
                  {t.date} &middot; {t.format} &middot; {t.checkout === 'double_out' ? 'DO' : 'SO'}
                </p>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--pe-text-muted)' }}>{t.status}</span>
            </div>
            {t.status === 'open' && (
              <button
                onClick={() => handleStart(t.id)}
                className="w-full py-3 rounded-lg font-bold text-sm mt-2"
                style={{ background: 'var(--pe-success)', color: '#000', minHeight: '48px', fontFamily: 'Verdana, Geneva, sans-serif' }}
              >
                Turnier starten
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
