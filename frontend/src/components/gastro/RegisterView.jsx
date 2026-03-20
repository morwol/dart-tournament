// RegisterView — Kasse (register) tab: shows all guests with open orders + settle actions
import { useState } from 'react';
import GuestSearchInput from './GuestSearchInput';
import RegisterGuestCard from './RegisterGuestCard';

export default function RegisterView({ guestOrders, settledIds, onSettle, loading, submitting, isTablet = false }) {
  const [search, setSearch] = useState('');

  const filtered = guestOrders.filter(
    (g) => !search || g.guest_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'var(--pe-font-body)' }}>
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

      {/* Guest cards — two columns on tablet, single column on mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : '1fr',
          gap: '12px',
        }}
      >
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
