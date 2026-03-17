import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client.js';

function timeAgo(isoString) {
  const mins = Math.floor((Date.now() - new Date(isoString)) / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins === 1) return 'vor 1 Minute';
  return `vor ${mins} Minuten`;
}

export default function KitchenView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchKitchenOrders = useCallback(async () => {
    try {
      const data = await api.get('/orders/by-guest');
      // Filter to guests that have at least one food item; also filter items to food only
      const foodGuests = data
        .map((guest) => ({
          ...guest,
          items: (guest.items || []).filter((item) => item.category === 'food'),
        }))
        .filter((guest) => guest.items.length > 0);
      setOrders(foodGuests);
      setLastRefresh(new Date());
    } catch {
      // Silently ignore polling errors — stale data remains visible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchKitchenOrders]);

  const refreshLabel = lastRefresh
    ? `Aktualisiert: ${lastRefresh.getHours().toString().padStart(2, '0')}:${lastRefresh.getMinutes().toString().padStart(2, '0')}`
    : '…';

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 16,
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2
            style={{
              color: 'var(--pe-text)',
              fontWeight: 'bold',
              fontSize: 20,
              margin: 0,
              fontFamily: 'Verdana, Geneva, sans-serif',
            }}
          >
            Offene Küchen-Bestellungen
          </h2>
          <span
            style={{
              background: 'var(--pe-warning)',
              color: '#000',
              borderRadius: 20,
              padding: '2px 10px',
              fontWeight: 'bold',
              marginLeft: 10,
              fontFamily: 'Verdana, Geneva, sans-serif',
            }}
          >
            {orders.length}
          </span>
        </div>
        <span
          style={{
            color: 'var(--pe-text-muted)',
            fontSize: 12,
            fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          {refreshLabel}
        </span>
      </div>

      {/* Loading state */}
      {loading && orders.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--pe-text-sub)', padding: 32 }}>
          Lade Bestellungen…
        </p>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 64, color: 'var(--pe-success)' }}>✓</div>
          <p
            style={{
              color: 'var(--pe-text-sub)',
              fontSize: 16,
              fontFamily: 'Verdana, Geneva, sans-serif',
            }}
          >
            Keine offenen Küchen-Bestellungen
          </p>
        </div>
      )}

      {/* Ticket grid */}
      {orders.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {orders.map((guest) => (
            <div
              key={guest.guest_id ?? guest.id}
              style={{
                background: 'var(--pe-bg-card)',
                border: '1px solid var(--pe-border)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div
                style={{
                  background: 'var(--pe-bg-elevated)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontWeight: 'bold',
                    color: 'var(--pe-text)',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                  }}
                >
                  {guest.guest_name ?? guest.name ?? 'Gast'}
                </span>
                <span
                  style={{
                    background: 'rgba(255,176,32,0.15)',
                    color: 'var(--pe-warning)',
                    borderRadius: 20,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontFamily: 'Verdana, Geneva, sans-serif',
                  }}
                >
                  {timeAgo(guest.oldest_order_at ?? guest.items[0]?.ordered_at)}
                </span>
              </div>

              {/* Card body */}
              <div style={{ padding: '12px 16px' }}>
                {guest.items.map((item, idx) => (
                  <div
                    key={item.order_id ?? idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom:
                        idx < guest.items.length - 1
                          ? '1px solid var(--pe-border)'
                          : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        color: 'var(--pe-text)',
                        fontFamily: 'Verdana, Geneva, sans-serif',
                      }}
                    >
                      {item.product_name}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        color: 'var(--pe-text-muted)',
                        fontWeight: 'bold',
                        fontFamily: 'Verdana, Geneva, sans-serif',
                      }}
                    >
                      ×{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
