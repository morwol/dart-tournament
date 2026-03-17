// ProductGrid — category filter bar + responsive product button grid
export default function ProductGrid({ products, onTap, isBlocked, categoryFilter, onCategoryChange, sessionCounts = new Map() }) {
  const categories = [
    { id: 'all', label: 'Alle' },
    { id: 'drink', label: 'Getränke' },
    { id: 'food', label: 'Speisen' },
  ];

  const filtered = categoryFilter !== 'all'
    ? products.filter((p) => p.category === categoryFilter)
    : products;

  const gridContent = (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {filtered.map((product) => (
        <button
          key={product.id}
          onClick={() => onTap(product)}
          style={{
            minHeight: '96px',
            borderRadius: '12px',
            border: '1px solid var(--pe-border)',
            background: 'var(--pe-bg-card)',
            color: 'var(--pe-text)',
            fontFamily: 'Verdana, Geneva, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            gap: '6px',
            width: '100%',
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{product.name}</span>
          <span style={{ fontSize: '13px', color: 'var(--pe-cyan-bright)' }}>
            {parseFloat(product.price).toFixed(2)} €
          </span>
          {sessionCounts.get(product.id) > 0 && (
            <span style={{
              fontSize: 11,
              fontWeight: 'bold',
              color: 'var(--pe-cyan-bright)',
              fontFamily: 'Verdana, Geneva, sans-serif',
            }}>
              ×{sessionCounts.get(product.id)}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Category filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            style={{
              flex: 1,
              minHeight: '64px',
              borderRadius: '12px',
              border: '1px solid var(--pe-border)',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
              background: categoryFilter === cat.id ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)',
              color: categoryFilter === cat.id ? 'var(--pe-text)' : 'var(--pe-text-sub)',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid — dimmed and non-interactive when blocked */}
      {isBlocked ? (
        <div style={{ opacity: 0.4, pointerEvents: 'none' }}>{gridContent}</div>
      ) : gridContent}
    </div>
  );
}
