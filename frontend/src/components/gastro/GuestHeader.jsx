// GuestHeader — shows the current guest's info, status badge, close button, lock/unlock and optional settle button
const btnStyle = {
  fontFamily: 'Verdana, Geneva, sans-serif',
  borderRadius: '12px',
  fontWeight: 'bold',
  border: '1px solid var(--pe-border)',
  cursor: 'pointer',
};

export default function GuestHeader({ guest, isBlocked, onClose, onToggleLock, lockLoading, onSettle }) {
  return (
    <div
      className="mb-4 p-3 rounded-xl"
      style={{
        background: 'var(--pe-bg-card)',
        border: `1px solid ${isBlocked ? 'var(--pe-danger)' : 'var(--pe-border)'}`,
      }}
    >
      {/* Row 1: Name + Badge + Close */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div>
            <p style={{ fontWeight: 'bold', color: 'var(--pe-text)', margin: 0, fontSize: '15px' }}>
              {guest.name || 'Gast'}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--pe-text-muted)', margin: '2px 0 0' }}>#{guest.id}</p>
          </div>
          {/* Status badge */}
          <span
            style={{
              flexShrink: 0,
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: isBlocked ? 'var(--pe-danger)' : 'var(--pe-success)',
              border: `1px solid ${isBlocked ? 'var(--pe-danger)' : 'var(--pe-success)'}`,
              background: isBlocked ? 'rgba(255,69,96,0.12)' : 'rgba(0,229,160,0.10)',
            }}
          >
            {isBlocked ? 'Gesperrt' : 'Aktiv'}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            ...btnStyle,
            minHeight: '64px',
            padding: '0 16px',
            background: 'var(--pe-bg-elevated)',
            color: 'var(--pe-text-sub)',
            border: '1px solid var(--pe-border)',
            flexShrink: 0,
          }}
        >
          ✕ Schließen
        </button>
      </div>

      {/* Row 2: Lock / Unlock */}
      <button
        onClick={onToggleLock}
        disabled={lockLoading}
        style={{
          ...btnStyle,
          width: '100%',
          minHeight: '64px',
          background: isBlocked ? 'rgba(0,229,160,0.12)' : 'rgba(255,69,96,0.12)',
          color: isBlocked ? 'var(--pe-success)' : 'var(--pe-danger)',
          border: `1px solid ${isBlocked ? 'var(--pe-success)' : 'var(--pe-danger)'}`,
          fontSize: '13px',
          opacity: lockLoading ? 0.6 : 1,
        }}
      >
        {lockLoading
          ? isBlocked
            ? 'Wird entsperrt...'
            : 'Wird gesperrt...'
          : isBlocked
          ? 'Armband entsperren'
          : 'Armband sperren'}
      </button>

      {/* Hint when blocked */}
      {isBlocked && (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '13px',
            color: 'var(--pe-danger)',
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          Armband gesperrt — keine Bestellungen möglich
        </p>
      )}

      {/* Optional: Settle button */}
      {onSettle && !isBlocked && (
        <button
          onClick={onSettle}
          style={{
            width: '100%',
            minHeight: '64px',
            marginTop: '10px',
            borderRadius: '12px',
            background: 'rgba(0,229,160,0.12)',
            color: 'var(--pe-success)',
            border: '1px solid var(--pe-success)',
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Abrechnen
        </button>
      )}
    </div>
  );
}
