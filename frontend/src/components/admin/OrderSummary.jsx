import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function OrderSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/summary')
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--pe-text-sub)' }}>Lade Abrechnung...</p>;
  if (!summary) return <p style={{ color: 'var(--pe-danger)' }}>Fehler beim Laden.</p>;

  const items = summary.items || [];
  const total = summary.total ?? items.reduce((sum, i) => sum + (i.total_price || 0), 0);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--pe-cyan-bright)' }}>Tagesabrechnung</h2>

      <div
        className="rounded-xl overflow-hidden mb-4"
        style={{ border: '1px solid var(--pe-border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--pe-bg-elevated)' }}>
              <th className="text-left p-3" style={{ color: 'var(--pe-text-sub)' }}>Produkt</th>
              <th className="text-right p-3" style={{ color: 'var(--pe-text-sub)' }}>Menge</th>
              <th className="text-right p-3" style={{ color: 'var(--pe-text-sub)' }}>Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ background: 'var(--pe-bg-card)', borderTop: '1px solid var(--pe-border)' }}>
                <td className="p-3" style={{ color: 'var(--pe-text)' }}>{item.product_name}</td>
                <td className="text-right p-3" style={{ color: 'var(--pe-text-sub)' }}>{item.total_quantity}</td>
                <td className="text-right p-3" style={{ color: 'var(--pe-text)' }}>
                  {parseFloat(item.total_price).toFixed(2)} EUR
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="flex justify-between items-center p-4 rounded-xl"
        style={{ background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}
      >
        <span className="font-bold text-lg" style={{ color: 'var(--pe-text)' }}>Gesamtumsatz:</span>
        <span className="font-bold text-xl" style={{ color: 'var(--pe-success)' }}>
          {parseFloat(total).toFixed(2)} EUR
        </span>
      </div>
    </div>
  );
}
