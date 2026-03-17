import { useState } from 'react';
import NFCScanner from '../nfc/NFCScanner';
import GuestSearchInput from './GuestSearchInput';

/**
 * GuestSelector — NFC tap-to-start with manual accordion fallback.
 *
 * Props:
 *   guests           — array of all guest objects
 *   onGuestSelect    — called with the guest object when a guest is selected
 *   onCreateGuest    — called with a name string when user clicks "+ Neu"
 *   nfcAvailable     — boolean: 'NDEFReader' in window
 *   onRequestNfcScan — called with the raw NFC UID when NFCScanner fires onScan
 *   scanning         — boolean: true while NFC scan is being processed
 */
export default function GuestSelector({
  guests,
  onGuestSelect,
  onCreateGuest,
  nfcAvailable,
  onRequestNfcScan,
  scanning,
}) {
  const [manualOpen, setManualOpen] = useState(!nfcAvailable);
  const [search, setSearch] = useState('');

  const filteredGuests = guests.filter(
    (g) => !search || g.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* NFC section — only when NFC is available */}
      {nfcAvailable && (
        <NFCScanner onScan={onRequestNfcScan} scanning={scanning} />
      )}

      {/* Manual toggle — only shown when NFC is available */}
      {nfcAvailable && (
        <button
          type="button"
          onClick={() => setManualOpen((o) => !o)}
          style={{
            minHeight: '48px',
            background: 'var(--pe-bg-elevated)',
            border: '1px solid var(--pe-border)',
            borderRadius: '12px',
            color: 'var(--pe-text-sub)',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'Verdana, Geneva, sans-serif',
            marginTop: '12px',
          }}
        >
          {manualOpen ? '▲ Manuelle Auswahl schließen' : '▼ Oder manuell auswählen'}
        </button>
      )}

      {/* Manual section — always visible when NFC unavailable, toggleable otherwise */}
      {(manualOpen || !nfcAvailable) && (
        <div style={{ marginTop: '8px' }}>
          <GuestSearchInput
            value={search}
            onChange={setSearch}
            onCreateNew={() => onCreateGuest(search.trim() || 'Neuer Gast')}
          />

          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '8px',
            }}
          >
            {filteredGuests.map((g) => {
              const gBlocked = g.active === 0 || g.active === false;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onGuestSelect(g)}
                  style={{
                    minHeight: '64px',
                    width: '100%',
                    background: 'var(--pe-bg-card)',
                    border: `1px solid ${gBlocked ? 'var(--pe-danger)' : 'var(--pe-border)'}`,
                    borderRadius: '12px',
                    padding: '0 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--pe-text)',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{g.name || 'Gast'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {gBlocked && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: 'var(--pe-danger)',
                          border: '1px solid var(--pe-danger)',
                          borderRadius: '20px',
                          padding: '2px 8px',
                        }}
                      >
                        Gesperrt
                      </span>
                    )}
                    <span style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>
                      #{g.id}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredGuests.length === 0 && (
              <p
                style={{
                  color: 'var(--pe-text-muted)',
                  textAlign: 'center',
                  padding: '16px',
                  fontSize: '13px',
                }}
              >
                {guests.length === 0
                  ? 'Noch keine Gäste. Mit "+ Neu" ersten Gast anlegen.'
                  : 'Kein Gast gefunden.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
