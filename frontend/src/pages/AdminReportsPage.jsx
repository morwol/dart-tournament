import { useEffect, useState } from 'react';
import { api } from '../api/client';
import BackButton from '../components/BackButton';

export default function AdminReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/reports/gastro')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--pe-text-sub)' }}>Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <BackButton to="/admin" label="Admin" />
        <p style={{ color: 'var(--pe-danger)', textAlign: 'center', marginTop: 24 }}>
          {error}
        </p>
      </div>
    );
  }

  const { revenue, top_products, orders_per_guest, by_category, settlements } = data || {};

  return (
    <div className="pe-page-enter" style={{ fontFamily: 'var(--pe-font-body)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 12px 100px' }}>
        <BackButton to="/admin" label="Admin" />

        <h1
          className="pe-font-display"
          style={{
            fontSize: 22,
            fontWeight: 700,
            background: 'var(--pe-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '12px 0 20px',
          }}
        >
          Gastro Reports
        </h1>

        {/* Revenue overview */}
        {revenue && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
            marginBottom: 24,
          }}>
            <RevenueCard label="Total Revenue" value={formatCurrency(revenue.total)} color="var(--pe-success)" />
            <RevenueCard label="Open Orders" value={formatCurrency(revenue.open)} color="var(--pe-warning)" />
            <RevenueCard label="Settled" value={formatCurrency(revenue.settled)} />
            <RevenueCard label="Total Orders" value={revenue.order_count ?? 0} />
          </div>
        )}

        {/* Category breakdown */}
        {by_category && by_category.length > 0 && (
          <Section title="Revenue by Category">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {by_category.map((cat) => (
                <div
                  key={cat.category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--pe-bg-card)',
                    border: '1px solid var(--pe-border)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--pe-text)', textTransform: 'capitalize' }}>
                    {cat.category}
                  </span>
                  <span className="pe-font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--pe-cyan-bright)' }}>
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Top products */}
        {top_products && top_products.length > 0 && (
          <Section title="Top Products">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Product', 'Sold', 'Revenue'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === 'Product' ? 'left' : 'right',
                        padding: '8px 10px',
                        fontSize: 11,
                        color: 'var(--pe-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        borderBottom: '1px solid var(--pe-border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top_products.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--pe-border)' }}>
                    <td style={{ padding: '10px', fontSize: 14, color: 'var(--pe-text)', fontWeight: 'bold' }}>
                      {p.name}
                    </td>
                    <td className="pe-font-display" style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-text)', textAlign: 'right' }}>
                      {p.quantity_sold}
                    </td>
                    <td className="pe-font-display" style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-cyan-bright)', textAlign: 'right' }}>
                      {formatCurrency(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Orders per guest */}
        {orders_per_guest && orders_per_guest.length > 0 && (
          <Section title="Orders per Guest">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Guest', 'Orders', 'Total'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === 'Guest' ? 'left' : 'right',
                        padding: '8px 10px',
                        fontSize: 11,
                        color: 'var(--pe-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        borderBottom: '1px solid var(--pe-border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders_per_guest.map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--pe-border)' }}>
                    <td style={{ padding: '10px', fontSize: 14, color: 'var(--pe-text)', fontWeight: 'bold' }}>
                      {g.guest_name || 'Guest'}
                    </td>
                    <td className="pe-font-display" style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-text)', textAlign: 'right' }}>
                      {g.order_count}
                    </td>
                    <td className="pe-font-display" style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-cyan-bright)', textAlign: 'right' }}>
                      {formatCurrency(g.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Settlements */}
        {settlements && settlements.length > 0 && (
          <Section title="Recent Settlements">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {settlements.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--pe-bg-card)',
                    border: '1px solid var(--pe-border)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--pe-text)' }}>
                      {s.guest_name || 'Guest'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--pe-text-muted)', marginLeft: 8 }}>
                      {s.settled_at}
                    </span>
                  </div>
                  <span className="pe-font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--pe-success)' }}>
                    {formatCurrency(s.total)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function RevenueCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--pe-bg-card)',
      borderRadius: 12,
      border: '1px solid var(--pe-border)',
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span
        className="pe-font-display"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: color || 'var(--pe-text)',
          letterSpacing: '0.01em',
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
    </div>
  );
}

function formatCurrency(val) {
  if (val == null) return '—';
  return `${parseFloat(val).toFixed(2)} EUR`;
}
