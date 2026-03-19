import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import BackButton from '../components/BackButton';

export default function OrderPage() {
  const { uid } = useParams();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/nfc/${uid}/statement`)
      .then(setStatement)
      .catch((err) => setError(err.message || 'Kontoauszug konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [uid]);

  const cardStyle = {
    background: 'var(--pe-bg-card)',
    border: '1px solid var(--pe-border)',
    borderRadius: 'var(--pe-radius-md)',
    padding: '16px',
    fontFamily: 'var(--pe-font-body)',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--pe-font-body)' }}>
        <p style={{ color: 'var(--pe-text-sub)' }}>Lade...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', padding: '16px', maxWidth: '480px', margin: '0 auto', fontFamily: 'var(--pe-font-body)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <BackButton to="/" />
          <img src="/logo.jpeg" alt="DartEvent" style={{ height: '40px' }} />
        </div>
        <div style={{ ...cardStyle, border: '1px solid var(--pe-danger)', textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: 'var(--pe-danger)', fontWeight: 'bold', marginBottom: '8px' }}>Fehler</p>
          <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { guest, orders = [], total_open = 0, total_paid = 0 } = statement || {};
  const isBlocked = guest?.active === 0 || guest?.active === false;

  return (
    <div style={{ minHeight: '100vh', padding: '16px', maxWidth: '480px', margin: '0 auto', fontFamily: 'var(--pe-font-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <BackButton to="/" />
        <img src="/logo.jpeg" alt="DartEvent" style={{ height: '40px' }} />
      </div>

      <h1
        style={{
          background: 'var(--pe-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          fontSize: '20px',
          marginBottom: '20px',
        }}
      >
        Kontoauszug
      </h1>

      {/* Gast-Info */}
      {guest && (
        <div style={{ ...cardStyle, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--pe-text)', margin: 0 }}>{guest.name || 'Gast'}</p>
            <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)', margin: '4px 0 0' }}>#{guest.id}</p>
          </div>
          {isBlocked ? (
            <span
              style={{
                background: 'rgba(255,69,96,0.15)',
                color: 'var(--pe-danger)',
                border: '1px solid var(--pe-danger)',
                borderRadius: 'var(--pe-radius-xl)',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              Gesperrt
            </span>
          ) : (
            <span
              style={{
                background: 'rgba(0,229,160,0.12)',
                color: 'var(--pe-success)',
                border: '1px solid var(--pe-success)',
                borderRadius: 'var(--pe-radius-xl)',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              Aktiv
            </span>
          )}
        </div>
      )}

      {/* Bestellungen */}
      {orders.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 16px' }}>
          <p style={{ color: 'var(--pe-text-muted)', fontSize: '15px' }}>Noch keine Bestellungen</p>
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: 'var(--pe-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}
          >
            Bestellungen
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  ...cardStyle,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: 'var(--pe-text)' }}>
                    {order.product_name}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--pe-text-muted)' }}>
                    {order.quantity} &times; {parseFloat(order.price ?? (order.total / order.quantity)).toFixed(2)} EUR
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--pe-text-sub)' }}>
                    {parseFloat(order.total ?? (order.price * order.quantity)).toFixed(2)} EUR
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '3px 10px',
                      borderRadius: 'var(--pe-radius-xl)',
                      color: order.status === 'paid' ? 'var(--pe-success)' : 'var(--pe-warning)',
                      border: `1px solid ${order.status === 'paid' ? 'var(--pe-success)' : 'var(--pe-warning)'}`,
                      background: order.status === 'paid' ? 'rgba(0,229,160,0.08)' : 'rgba(255,176,32,0.08)',
                    }}
                  >
                    {order.status === 'paid' ? 'Bezahlt' : 'Offen'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zusammenfassung */}
      {orders.length > 0 && (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: 'var(--pe-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0,
            }}
          >
            Zusammenfassung
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--pe-text-sub)' }}>Offen</span>
            <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--pe-warning)' }}>
              {parseFloat(total_open).toFixed(2)} EUR
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--pe-border)', paddingTop: '10px' }}>
            <span style={{ fontSize: '14px', color: 'var(--pe-text-sub)' }}>Bereits bezahlt</span>
            <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--pe-success)' }}>
              {parseFloat(total_paid).toFixed(2)} EUR
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
