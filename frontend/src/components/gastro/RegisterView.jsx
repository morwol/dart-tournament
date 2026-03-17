// RegisterView — Kasse (register) tab: shows all guests with open orders + settle actions
import { useState } from 'react';
import GuestSearchInput from './GuestSearchInput';
import RegisterGuestCard from './RegisterGuestCard';

export default function RegisterView({ guestOrders, settledIds, onSettle, loading, submitting }) {
  const [search, setSearch] = useState('');

  const filtered = guestOrders.filter(
    (g) => !search || g.guest_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Search input */}
      <div style={{ marginBottom: '16px' }}>
        <GuestSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Gast suchen…"
        />
      </div>

      {/* Loading state */}
      {loading && guestOrders.length === 0 && (
        <p style={{ color: 'var(--pe-text-sub)', textAlign: 'center' }}>
          Lade Bestellungen…
        </p>
      )}

      {/* Empty state */}
      {!loading && guestOrders.length === 0 && (
        <p
          style={{
            color: 'var(--pe-text-muted)',
            padding: '32px 0',
            textAlign: 'center',
          }}
        >
          Keine offenen Bestellungen
        </p>
      )}

      {/* Guest cards */}
      <div className="space-y-3">
        {filtered.map((g) => (
          <RegisterGuestCard
            key={g.guest_id}
            guest={g}
            isSettled={settledIds.has(g.guest_id)}
            onSettle={() => onSettle(g)}
            submitting={submitting}
          />
        ))}
      </div>
    </div>
  );
}
