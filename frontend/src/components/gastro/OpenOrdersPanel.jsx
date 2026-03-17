import { useState } from 'react';

// Accordion panel showing a guest's currently open (unpaid) orders.
// Props:
//   items  — Array<{ product_name, quantity, total }>
//   total  — number (sum of all open items)
export default function OpenOrdersPanel({ items, total }) {
  const [open, setOpen] = useState(items.length <= 3);

  return (
    <div style={{ marginBottom: '16px', fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Header — always visible, clickable to toggle */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'var(--pe-bg-elevated)',
          border: '1px solid var(--pe-border)',
          borderRadius: open ? '12px 12px 0 0' : '12px',
          padding: '0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--pe-text-sub)',
          fontWeight: 'bold',
          fontSize: '13px',
          fontFamily: 'Verdana, Geneva, sans-serif',
          minHeight: '48px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span>
          {items.length} offene Artikel — {parseFloat(total || 0).toFixed(2)} €
        </span>
        <span style={{ marginLeft: '8px', fontSize: '14px' }}>{open ? '▾' : '▸'}</span>
      </div>

      {/* Body — visible when expanded */}
      {open && (
        <div
          style={{
            background: 'var(--pe-bg-elevated)',
            border: '1px solid var(--pe-border)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: 'var(--pe-text-muted)',
                    textTransform: 'uppercase',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                  }}
                >
                  Artikel
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: 'var(--pe-text-muted)',
                    textTransform: 'uppercase',
                    width: '48px',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                  }}
                >
                  Menge
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: 'var(--pe-text-muted)',
                    textTransform: 'uppercase',
                    width: '80px',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                  }}
                >
                  Preis
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--pe-border)' }}>
                  <td
                    style={{
                      padding: '7px 8px',
                      fontSize: '13px',
                      color: 'var(--pe-text)',
                      fontFamily: 'Verdana, Geneva, sans-serif',
                    }}
                  >
                    {item.product_name}
                  </td>
                  <td
                    style={{
                      padding: '7px 8px',
                      fontSize: '13px',
                      color: 'var(--pe-text)',
                      textAlign: 'center',
                      fontFamily: 'Verdana, Geneva, sans-serif',
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: '7px 8px',
                      fontSize: '13px',
                      color: 'var(--pe-text-sub)',
                      textAlign: 'right',
                      fontFamily: 'Verdana, Geneva, sans-serif',
                    }}
                  >
                    {parseFloat(item.total).toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--pe-border)' }}>
                <td
                  colSpan="2"
                  style={{
                    padding: '7px 8px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: 'var(--pe-text-sub)',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                  }}
                >
                  Gesamt offen
                </td>
                <td
                  style={{
                    padding: '7px 8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: 'var(--pe-cyan-bright)',
                    textAlign: 'right',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                  }}
                >
                  {parseFloat(total || 0).toFixed(2)} €
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
