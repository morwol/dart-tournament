const OrderCartItem = ({ item, onAdd, onRemove }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '8px 0',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: 'var(--pe-text)',
            fontWeight: 'bold',
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            color: 'var(--pe-text-muted)',
            fontSize: 12,
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          {item.price.toFixed(2)} € / Stk.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onRemove(item.product_id)}
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 20,
            background: 'var(--pe-bg-elevated)',
            color: 'var(--pe-danger)',
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          −
        </button>

        <div
          style={{
            minWidth: 32,
            textAlign: 'center',
            color: 'var(--pe-text)',
            fontWeight: 'bold',
            fontSize: 16,
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          {item.quantity}
        </div>

        <button
          onClick={() => onAdd(item.product_id)}
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 20,
            background: 'var(--pe-bg-elevated)',
            color: 'var(--pe-success)',
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          +
        </button>

        <div
          style={{
            color: 'var(--pe-cyan-bright)',
            fontWeight: 'bold',
            minWidth: 56,
            textAlign: 'right',
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          {(item.quantity * item.price).toFixed(2)} €
        </div>
      </div>
    </div>
  );
};

export default OrderCartItem;
