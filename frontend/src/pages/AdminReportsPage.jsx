import { useEffect, useState } from 'react';
import { api } from '../api/client';

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
        <p style={{ color: 'var(--pe-text-sub)' }}>Berichte werden geladen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <p style={{ color: 'var(--pe-danger)', textAlign: 'center', marginTop: 24 }}>
          Fehler: {error}
        </p>
      </div>
    );
  }

  const { revenue, top_products, orders_per_guest, by_category } = data || {};

  return (
    <div className="pe-page-enter" style={{ fontFamily: 'var(--pe-font-body)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 12px 100px' }}>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            background: 'var(--pe-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '12px 0 20px',
          }}
        >
          Gastro Auswertung
        </h1>

        {/* Umsatz-Übersicht */}
        {revenue && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
            marginBottom: 24,
          }}>
            <KennzahlKarte label="Gesamtumsatz" wert={formatWaehrung(revenue.total_revenue)} farbe="var(--pe-success)" />
            <KennzahlKarte label="Offen" wert={formatWaehrung(revenue.open_revenue)} farbe="var(--pe-warning)" />
            <KennzahlKarte label="Bezahlt" wert={formatWaehrung(revenue.paid_revenue)} />
            <KennzahlKarte label="Bestellungen" wert={revenue.total_orders ?? 0} />
            <KennzahlKarte label="Gäste" wert={revenue.total_guests ?? 0} />
          </div>
        )}

        {/* Umsatz nach Kategorie */}
        {by_category && by_category.length > 0 && (
          <Abschnitt titel="Nach Kategorie">
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
                    {cat.category === 'food' ? 'Speisen' : cat.category === 'drink' ? 'Getränke' : cat.category}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--pe-cyan-bright)', display: 'block' }}>
                      {formatWaehrung(cat.total_revenue)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--pe-text-muted)' }}>
                      {cat.total_quantity} Stk.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Abschnitt>
        )}

        {/* Top-Produkte */}
        {top_products && top_products.length > 0 && (
          <Abschnitt titel="Top-Produkte">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[['Produkt', 'left'], ['Verkauft', 'right'], ['Umsatz', 'right']].map(([h, align]) => (
                    <th
                      key={h}
                      style={{
                        textAlign: align,
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
                {top_products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--pe-border)' }}>
                    <td style={{ padding: '10px', fontSize: 14, color: 'var(--pe-text)', fontWeight: 'bold' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-text)', textAlign: 'right' }}>
                      {p.total_quantity}
                    </td>
                    <td style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-cyan-bright)', textAlign: 'right' }}>
                      {formatWaehrung(p.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Abschnitt>
        )}

        {/* Bestellungen pro Gast */}
        {orders_per_guest && orders_per_guest.length > 0 && (
          <Abschnitt titel="Pro Gast">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[['Gast', 'left'], ['Bestellungen', 'right'], ['Offen', 'right'], ['Bezahlt', 'right']].map(([h, align]) => (
                    <th
                      key={h}
                      style={{
                        textAlign: align,
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
                {orders_per_guest.map((g) => (
                  <tr key={g.guest_id} style={{ borderBottom: '1px solid var(--pe-border)' }}>
                    <td style={{ padding: '10px', fontSize: 14, color: 'var(--pe-text)', fontWeight: 'bold' }}>
                      {g.guest_name || 'Unbekannt'}
                    </td>
                    <td style={{ padding: '10px', fontSize: 14, color: 'var(--pe-text)', textAlign: 'right' }}>
                      {g.order_count}
                    </td>
                    <td style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-warning)', textAlign: 'right' }}>
                      {formatWaehrung(g.open_amount)}
                    </td>
                    <td style={{ padding: '10px', fontSize: 14, fontWeight: 700, color: 'var(--pe-success)', textAlign: 'right' }}>
                      {formatWaehrung(g.paid_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Abschnitt>
        )}

        {!revenue && !loading && (
          <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', marginTop: 48 }}>
            Noch keine Gastro-Daten vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}

function Abschnitt({ titel, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
        {titel}
      </h2>
      {children}
    </div>
  );
}

function KennzahlKarte({ label, wert, farbe }) {
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
      <span style={{ fontSize: 22, fontWeight: 700, color: farbe || 'var(--pe-text)' }}>
        {wert}
      </span>
      <span style={{ fontSize: 11, color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
    </div>
  );
}

function formatWaehrung(val) {
  if (val == null) return '—';
  return `${parseFloat(val).toFixed(2)} €`;
}
