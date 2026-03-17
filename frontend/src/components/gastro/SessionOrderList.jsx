// frontend/src/components/gastro/SessionOrderList.jsx
export default function SessionOrderList({ orders, onUndo }) {
  if (!orders || orders.length === 0) return null;

  const total = orders.reduce((sum, o) => sum + parseFloat(o.price), 0);

  return (
    <div style={{
      background: 'var(--pe-bg-card)',
      border: '1px solid var(--pe-border)',
      borderRadius: 'var(--pe-radius-md)',
      padding: 12,
      marginTop: 12,
      fontFamily: 'var(--pe-font-body)',
    }}>
      {/* Header */}
      <div style={{
        fontWeight: 'bold',
        color: 'var(--pe-text)',
        fontSize: 14,
        marginBottom: 8,
        fontFamily: 'var(--pe-font-body)',
      }}>
        Diese Bestellung ({orders.length} Artikel, {total.toFixed(2)} €)
      </div>

      {/* Order rows */}
      {orders.map((order) => (
        <div
          key={order.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '4px 0',
            borderBottom: '1px solid var(--pe-border)',
          }}
        >
          <span style={{
            flex: 1,
            color: 'var(--pe-text)',
            fontSize: 14,
            fontFamily: 'var(--pe-font-body)',
          }}>
            {order.product_name}
          </span>
          <span style={{
            color: 'var(--pe-text-sub)',
            fontSize: 13,
            minWidth: 56,
            textAlign: 'right',
            fontFamily: 'var(--pe-font-body)',
          }}>
            {parseFloat(order.price).toFixed(2)} €
          </span>
          <button
            onClick={() => onUndo(order.id)}
            style={{
              minWidth: 64,
              minHeight: 64,
              color: 'var(--pe-danger)',
              background: 'var(--pe-bg-elevated)',
              border: 'none',
              borderRadius: 'var(--pe-radius-md)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 18,
              fontFamily: 'var(--pe-font-body)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Total */}
      <div style={{
        textAlign: 'right',
        marginTop: 10,
        color: 'var(--pe-cyan-bright)',
        fontWeight: 'bold',
        fontSize: 15,
        fontFamily: 'var(--pe-font-body)',
      }}>
        Gesamt: {total.toFixed(2)} €
      </div>
    </div>
  );
}
