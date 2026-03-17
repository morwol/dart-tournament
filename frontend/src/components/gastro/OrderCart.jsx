import OrderCartItem from './OrderCartItem';

const OrderCart = ({
  items,
  onAdd,
  onRemove,
  onSubmit,
  submitting,
  isBlocked,
  guestName,
  orderSuccess,
}) => {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const submitButtonStyle = {
    width: '100%',
    minHeight: 72,
    borderRadius: 16,
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'Verdana, Geneva, sans-serif',
    border: 'none',
    cursor: isBlocked ? 'not-allowed' : 'pointer',
    marginTop: 12,
    ...(isBlocked
      ? {
          background: 'var(--pe-bg-elevated)',
          color: 'var(--pe-danger)',
          border: '1px solid var(--pe-danger)',
        }
      : submitting
      ? {
          background: 'var(--pe-gradient)',
          color: 'var(--pe-text)',
          opacity: 0.6,
        }
      : {
          background: 'var(--pe-gradient)',
          color: 'var(--pe-text)',
        }),
  };

  const submitLabel = isBlocked
    ? 'Armband gesperrt'
    : submitting
    ? 'Wird gespeichert\u2026'
    : 'Bestellen';

  const dividerStyle = {
    borderTop: '1px solid var(--pe-border)',
    margin: '8px 0',
  };

  // Inlined cart content — shared between tablet and mobile layouts
  const cartContent = (
    <>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 16,
          color: 'var(--pe-text)',
          marginBottom: 12,
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}
      >
        Warenkorb ({totalQty})
      </div>

      <div style={dividerStyle} />

      {items.map((item) => (
        <OrderCartItem
          key={item.product_id}
          item={item}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      ))}

      <div style={dividerStyle} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        <span
          style={{
            color: 'var(--pe-text)',
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          Gesamt
        </span>
        <span
          style={{
            color: 'var(--pe-cyan-bright)',
            fontWeight: 'bold',
            fontSize: 20,
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          {total.toFixed(2)} &euro;
        </span>
      </div>

      <button
        onClick={onSubmit}
        disabled={isBlocked || submitting}
        style={submitButtonStyle}
      >
        {submitLabel}
      </button>

      {orderSuccess && items.length === 0 && (
        <p
          style={{
            color: 'var(--pe-success)',
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: 12,
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          &#10003; Bestellung gespeichert!
        </p>
      )}
    </>
  );

  return (
    <>
      {/* Tablet sidebar (md and up) */}
      <div className="hidden md:block">
        <div
          style={{
            position: 'sticky',
            top: 16,
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            background: 'var(--pe-bg-card)',
            border: '1px solid var(--pe-border)',
            borderRadius: 16,
            padding: 16,
          }}
        >
          {cartContent}
        </div>
      </div>

      {/* Mobile bottom sheet (below md) */}
      <div className="md:hidden">
        {items.length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'var(--pe-bg-elevated)',
              borderTop: '1px solid var(--pe-border)',
              borderRadius: '20px 20px 0 0',
              padding: 16,
              maxHeight: '50vh',
              overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 40,
                height: 4,
                background: 'var(--pe-border)',
                borderRadius: 2,
                margin: '0 auto 12px',
              }}
            />
            {cartContent}
          </div>
        )}
      </div>
    </>
  );
};

export default OrderCart;
