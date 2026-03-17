// RegisterGuestCard — individual guest card for the Kasse (register) view
export default function RegisterGuestCard({ guest, isSettled, onSettle, submitting }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: isSettled ? 'rgba(0,229,160,0.08)' : 'var(--pe-bg-card)',
        border: isSettled ? '1px solid var(--pe-success)' : '1px solid var(--pe-border)',
        transition: 'all 0.3s',
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      {/* Guest header */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--pe-border)',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--pe-text)' }}>
          {guest.guest_name || 'Gast'}
        </span>
        <span
          style={{
            fontWeight: 'bold',
            fontSize: '20px',
            color: isSettled ? 'var(--pe-success)' : 'var(--pe-cyan-bright)',
          }}
        >
          {isSettled ? '✓ Abgerechnet' : `${parseFloat(guest.total || 0).toFixed(2)} €`}
        </span>
      </div>

      {/* Item table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--pe-bg-elevated)' }}>
            <th
              style={{
                textAlign: 'left',
                padding: '8px 16px',
                fontSize: '11px',
                color: 'var(--pe-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Artikel
            </th>
            <th
              style={{
                textAlign: 'center',
                padding: '8px 16px',
                fontSize: '11px',
                color: 'var(--pe-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '64px',
              }}
            >
              Menge
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '8px 16px',
                fontSize: '11px',
                color: 'var(--pe-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '96px',
              }}
            >
              Preis
            </th>
          </tr>
        </thead>
        <tbody>
          {(guest.items || []).map((item, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--pe-border)' }}>
              <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--pe-text)' }}>
                {item.product_name}
              </td>
              <td
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: 'var(--pe-text)',
                  textAlign: 'center',
                }}
              >
                {item.quantity}
              </td>
              <td
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: 'var(--pe-text-sub)',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {parseFloat(item.total).toFixed(2)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Settle button */}
      {!isSettled && (
        <div style={{ padding: '12px 16px' }}>
          <button
            onClick={onSettle}
            disabled={submitting}
            style={{
              width: '100%',
              minHeight: '64px',
              borderRadius: '12px',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontWeight: 'bold',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: 'var(--pe-success)',
              color: '#000',
              fontSize: '15px',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Jetzt abrechnen
          </button>
        </div>
      )}
    </div>
  );
}
