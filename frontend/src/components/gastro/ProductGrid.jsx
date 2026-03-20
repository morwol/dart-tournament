// ProductGrid — category filter bar + responsive product button grid
// Props:
//   products        — array of product objects
//   onTap           — called with product when tapped
//   isBlocked       — if true, grid is dimmed and non-interactive
//   categoryFilter  — current active category ('all', 'drink', 'food')
//   onCategoryChange — called with category id when filter changes
//   sessionCounts   — Map<product_id, count> for tap feedback
//   isTablet        — boolean: tablet layout active (hides category bar, enlarges cards)
export default function ProductGrid({ products, onTap, isBlocked, categoryFilter, onCategoryChange, sessionCounts = new Map(), isTablet = false }) {
  const categories = [
    { id: 'all', label: 'Alle' },
    { id: 'drink', label: 'Getranke' },
    { id: 'food', label: 'Speisen' },
  ];

  const filtered = categoryFilter !== 'all'
    ? products.filter((p) => p.category === categoryFilter)
    : products;

  const gridContent = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isTablet
          ? 'repeat(3, 1fr)'
          : 'repeat(2, 1fr)',
        gap: isTablet ? '12px' : '10px',
      }}
    >
      {filtered.map((product) => (
        <button
          key={product.id}
          onClick={() => onTap(product)}
          style={{
            minHeight: isTablet ? '120px' : '96px',
            borderRadius: 'var(--pe-radius-md)',
            border: '1px solid var(--pe-border)',
            background: 'var(--pe-bg-card)',
            color: 'var(--pe-text)',
            fontFamily: 'var(--pe-font-body)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isTablet ? '16px' : '12px',
            gap: isTablet ? '8px' : '6px',
            width: '100%',
            transition: 'background 0.1s',
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: isTablet ? '15px' : '14px' }}>
            {product.name}
          </span>
          <span style={{ fontSize: isTablet ? '14px' : '13px', color: 'var(--pe-cyan-bright)' }}>
            {parseFloat(product.price).toFixed(2)} €
          </span>
          {sessionCounts.get(product.id) > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: 'var(--pe-cyan-bright)',
                fontFamily: 'var(--pe-font-body)',
                background: 'rgba(0,184,255,0.15)',
                borderRadius: 'var(--pe-radius-xl)',
                padding: '2px 8px',
              }}
            >
              x{sessionCounts.get(product.id)}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Category filter bar — hidden on tablet (sidebar handles filtering) */}
      {!isTablet && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              style={{
                flex: 1,
                minHeight: '64px',
                borderRadius: 'var(--pe-radius-md)',
                border: '1px solid var(--pe-border)',
                fontFamily: 'var(--pe-font-body)',
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
      )}

      {/* Product grid — dimmed and non-interactive when blocked */}
      {isBlocked ? (
        <div style={{ opacity: 0.4, pointerEvents: 'none' }}>{gridContent}</div>
      ) : gridContent}
    </div>
  );
}
