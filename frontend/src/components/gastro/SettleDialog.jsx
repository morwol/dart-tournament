// Extracted from GastronomyPage — shared settle confirmation dialog
// Props: guest, total, onConfirm, onCancel

export default function SettleDialog({ guest, total, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--pe-bg-card)',
          border: '1px solid var(--pe-border)',
          borderRadius: '16px',
          padding: '24px',
          width: 'min(480px, 90vw)',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}
      >
        <h3 style={{ color: 'var(--pe-text)', fontWeight: 'bold', fontSize: '18px', margin: '0 0 8px' }}>
          Abrechnung bestätigen
        </h3>
        <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', margin: '0 0 20px' }}>
          Gast <strong style={{ color: 'var(--pe-text)' }}>{guest.guest_name || guest.name || 'Gast'}</strong> jetzt abrechnen?
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid var(--pe-border)',
            borderBottom: '1px solid var(--pe-border)',
            marginBottom: '20px',
          }}
        >
          <span style={{ color: 'var(--pe-text-sub)', fontSize: '14px' }}>Gesamtbetrag</span>
          <span style={{ color: 'var(--pe-success)', fontWeight: 'bold', fontSize: '22px' }}>
            {parseFloat(total || 0).toFixed(2)} EUR
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              minHeight: '64px',
              borderRadius: '12px',
              border: '1px solid var(--pe-border)',
              background: 'var(--pe-bg-elevated)',
              color: 'var(--pe-text)',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              minHeight: '64px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--pe-success)',
              color: '#000',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Abrechnen
          </button>
        </div>
      </div>
    </div>
  );
}
