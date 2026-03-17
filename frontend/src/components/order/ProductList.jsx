// TODO: superseded by gastro/ProductGrid.jsx — remove after audit
import { useState } from 'react';

const categories = [
  { id: 'all', label: 'Alle' },
  { id: 'drink', label: 'Getraenke' },
  { id: 'food', label: 'Speisen' },
];

export default function ProductList({ products, onAdd }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? products : products.filter((p) => p.category === filter);

  return (
    <div>
      <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--pe-cyan-bright)' }}>Produkte</h2>

      <div className="flex gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className="px-3 rounded-lg text-sm font-bold"
            style={{
              background: filter === cat.id ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)',
              border: '1px solid var(--pe-border)',
              color: filter === cat.id ? 'var(--pe-text)' : 'var(--pe-text-sub)',
              fontFamily: 'var(--pe-font-body)',
              minHeight: '64px',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.filter((p) => p.available).map((product) => (
          <div
            key={product.id}
            className="p-3 rounded-xl flex flex-col"
            style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}
          >
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--pe-text)' }}>{product.name}</p>
            <p className="text-sm mb-3" style={{ color: 'var(--pe-cyan-bright)' }}>
              {parseFloat(product.price).toFixed(2)} EUR
            </p>
            <button
              onClick={() => onAdd(product)}
              className="mt-auto w-full py-3 rounded-lg font-bold text-sm"
              style={{
                background: 'var(--pe-blue-deep)',
                color: 'var(--pe-text)',
                minHeight: '64px',
                fontFamily: 'var(--pe-font-body)',
              }}
            >
              + Warenkorb
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
