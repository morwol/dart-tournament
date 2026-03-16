export default function Cart({ items, onRemove, onSubmit }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 p-4 rounded-t-2xl"
      style={{ background: 'var(--pe-bg-elevated)', borderTop: '1px solid var(--pe-border)' }}
    >
      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--pe-text-sub)' }}>
        Warenkorb ({items.length})
      </h3>
      <div className="space-y-1 max-h-32 overflow-y-auto mb-3">
        {items.map((item) => (
          <div key={item.product_id} className="flex justify-between items-center text-sm">
            <span style={{ color: 'var(--pe-text)' }}>
              {item.name} x{item.quantity}
            </span>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--pe-text-sub)' }}>
                {(item.price * item.quantity).toFixed(2)} EUR
              </span>
              <button
                onClick={() => onRemove(item.product_id)}
                className="rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--pe-bg-card)', color: 'var(--pe-danger)', fontFamily: 'var(--pe-font-body)', width: '44px', height: '44px', minWidth: '44px', padding: '10px', boxSizing: 'content-box' }}
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold" style={{ color: 'var(--pe-text)' }}>Gesamt:</span>
        <span className="font-bold text-lg" style={{ color: 'var(--pe-cyan-bright)' }}>{total.toFixed(2)} EUR</span>
      </div>
      <button
        onClick={onSubmit}
        className="w-full py-4 rounded-xl font-bold text-lg"
        style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '64px', fontFamily: 'var(--pe-font-body)' }}
      >
        Bestellen
      </button>
    </div>
  );
}
