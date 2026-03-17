// GastronomyPage — station-split architecture
// Stations: 'bar' (drinks + ordering), 'kitchen' (food tickets), 'register' (settle)
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import GastronomyLogin from '../components/gastro/GastronomyLogin';
import StationSelector from '../components/gastro/StationSelector';
import KitchenView from '../components/gastro/KitchenView';
import RegisterView from '../components/gastro/RegisterView';
import GuestSelector from '../components/gastro/GuestSelector';
import GuestHeader from '../components/gastro/GuestHeader';
import OpenOrdersPanel from '../components/gastro/OpenOrdersPanel';
import ProductGrid from '../components/gastro/ProductGrid';
import OrderCart from '../components/gastro/OrderCart';
import SettleDialog from '../components/gastro/SettleDialog';
import { useToastStore } from '../store/toasts';
import { useStore } from '../store';

export default function GastronomyPage() {
  const { addToast } = useToastStore();
  const { token, setToken: storeSetToken } = useStore();

  // Station state — persisted in sessionStorage
  const [station, setStation] = useState(() => {
    try { return sessionStorage.getItem('gastro_station') || null; } catch { return null; }
  });

  const selectStation = (s) => {
    setStation(s);
    try { sessionStorage.setItem('gastro_station', s); } catch { /* ignore */ }
  };

  const clearStation = () => {
    setStation(null);
    try { sessionStorage.removeItem('gastro_station'); } catch { /* ignore */ }
  };

  // Bar / ordering state
  const [guest, setGuest] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [productFilter, setProductFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestOpenOrders, setGuestOpenOrders] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [allGuests, setAllGuests] = useState([]);

  const isBlocked = guest != null && (guest.active === 0 || guest.active === false);

  // Register (Kasse) state
  const [guestOrders, setGuestOrders] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [settledIds, setSettledIds] = useState(new Set());

  // Settle dialog
  const [settleTarget, setSettleTarget] = useState(null);

  // Load products + all guests once token is available
  useEffect(() => {
    if (!token) return;
    api.get('/products').then(setProducts).catch(() => {});
    api.get('/nfc/guests').then(setAllGuests).catch(() => {});
  }, [token]);

  // Load open orders for the currently selected guest
  useEffect(() => {
    if (!token) return;
    if (!guest) { setGuestOpenOrders(null); return; }
    api.get(`/orders/guest/${guest.id}`).then(setGuestOpenOrders).catch(() => setGuestOpenOrders(null));
  }, [token, guest]);

  // NFC scan handler
  const handleNFCScan = async (uid) => {
    setScanning(true);
    try {
      const result = await api.post('/nfc/scan', { uid });
      setGuest(result);
      setCart([]);
      setOrderSuccess(false);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Gast nicht gefunden' });
    } finally {
      setScanning(false);
    }
  };

  // Cart helpers
  const addToCart = (product) => {
    // Accept both full product objects (product.id) from ProductGrid
    // and cart item objects (product.product_id) from OrderCartItem's + button
    const pid = product.id ?? product.product_id;
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === pid);
      if (existing) {
        return prev.map((item) =>
          item.product_id === pid ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: pid, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev
        .map((item) => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  // Submit order
  const submitOrder = async () => {
    if (!guest || cart.length === 0) return;
    setSubmitting(true);
    try {
      for (const item of cart) {
        await api.post('/orders', {
          guest_uid: guest.nfc_uid,
          product_id: item.product_id,
          quantity: item.quantity,
        });
      }
      setCart([]);
      setOrderSuccess(true);
      const updated = await api.get(`/orders/guest/${guest.id}`);
      setGuestOpenOrders(updated);
      setTimeout(() => setOrderSuccess(false), 2000);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Bestellung fehlgeschlagen – bitte erneut versuchen' });
    } finally {
      setSubmitting(false);
    }
  };

  // Settle flow
  const initSettle = (target) => {
    setSettleTarget(target);
  };

  const loadRegister = useCallback(async () => {
    setRegisterLoading(true);
    try {
      const ordersData = await api.get('/orders/by-guest');
      setGuestOrders(ordersData);
    } catch {
      // silently fail
    } finally {
      setRegisterLoading(false);
    }
  }, []);

  const confirmSettle = async () => {
    if (!settleTarget) return;
    setSubmitting(true);
    const targetId = settleTarget.guest_id || settleTarget.id;
    try {
      await api.post(`/orders/settle/${targetId}`);
      setSettleTarget(null);
      if (station === 'register') {
        setSettledIds((prev) => new Set([...prev, targetId]));
        setTimeout(() => {
          setSettledIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
          loadRegister();
        }, 2000);
        loadRegister();
      } else {
        // Bar station: reset guest after settling
        setGuest(null);
        setGuestOpenOrders(null);
        setCart([]);
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Abrechnung fehlgeschlagen – bitte erneut versuchen' });
    } finally {
      setSubmitting(false);
    }
  };

  // Lock / unlock guest armband
  const toggleGuestLock = async () => {
    if (!guest) return;
    const blocked = guest.active === 0 || guest.active === false;
    const endpoint = blocked ? `/nfc/${guest.nfc_uid}/activate` : `/nfc/${guest.nfc_uid}/deactivate`;
    setLockLoading(true);
    try {
      const updated = await api.put(endpoint);
      setGuest((prev) => ({ ...prev, ...updated }));
      setAllGuests((prev) => prev.map((g) => g.id === guest.id ? { ...g, ...updated } : g));
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' });
    } finally {
      setLockLoading(false);
    }
  };

  // Auto-refresh register view every 10 seconds
  useEffect(() => {
    if (!token) return;
    if (station !== 'register') return;
    loadRegister();
    const interval = setInterval(loadRegister, 10000);
    return () => clearInterval(interval);
  }, [token, station, loadRegister]);

  // Login gate
  const handleLogin = (newToken) => {
    storeSetToken(newToken);
  };

  if (!token) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
          background: 'var(--pe-bg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <GastronomyLogin onLogin={handleLogin} />
      </div>
    );
  }

  // Station gate
  if (!station) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 400,
          background: 'var(--pe-bg)',
          overflow: 'auto',
        }}
      >
        <StationSelector onSelect={selectStation} />
      </div>
    );
  }

  // Station-level product filtering
  // 'bar' shows drinks only, 'kitchen' and 'register' show all available
  const stationCategory = station === 'bar' ? 'drink' : null;
  const stationFilteredProducts = products.filter((p) => {
    if (!p.available) return false;
    if (stationCategory && p.category !== stationCategory) return false;
    return true;
  });

  // Station badge config
  const badgeConfig = {
    bar:      { label: 'Bar',   icon: '🍺', accent: 'var(--pe-cyan-bright)', accentBg: 'rgba(0,184,255,0.12)', accentBorder: 'rgba(0,184,255,0.35)' },
    kitchen:  { label: 'Küche', icon: '🍳', accent: 'var(--pe-warning)',     accentBg: 'rgba(255,176,32,0.12)',  accentBorder: 'rgba(255,176,32,0.35)' },
    register: { label: 'Kasse', icon: '💳', accent: 'var(--pe-success)',     accentBg: 'rgba(0,229,160,0.12)',  accentBorder: 'rgba(0,229,160,0.35)' },
  };
  const badge = badgeConfig[station];

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Settle confirmation dialog — rendered at top level so it works from any station */}
      {settleTarget && (
        <SettleDialog
          guest={settleTarget}
          total={settleTarget.total}
          onConfirm={confirmSettle}
          onCancel={() => setSettleTarget(null)}
        />
      )}

      {/* Station header bar: badge + switch button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          maxWidth: 1200,
          margin: '0 auto 4px',
        }}
      >
        {badge && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '20px',
              background: badge.accentBg,
              border: `1px solid ${badge.accentBorder}`,
            }}
          >
            <span style={{ fontSize: '16px' }}>{badge.icon}</span>
            <span style={{ color: badge.accent, fontWeight: 'bold', fontSize: '14px' }}>
              {badge.label}
            </span>
          </div>
        )}
        <button
          onClick={clearStation}
          style={{
            minHeight: 64,
            padding: '0 20px',
            background: 'var(--pe-bg-elevated)',
            border: '1px solid var(--pe-border)',
            borderRadius: 12,
            color: 'var(--pe-text-sub)',
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ⇄ Station wechseln
        </button>
      </div>

      {/* ===== BAR STATION ===== */}
      {station === 'bar' && (
        <div className="flex flex-col md:flex-row gap-4 max-w-5xl mx-auto p-4">
          {/* Left column: guest selector or guest detail + products */}
          <div className="flex-1 min-w-0">
            {!guest && (
              <GuestSelector
                guests={allGuests}
                onGuestSelect={(g) => { setGuest(g); setCart([]); setOrderSuccess(false); }}
                onCreateGuest={(name) =>
                  api.post('/nfc/create-manual', { name })
                    .then((g) => { setGuest(g); setCart([]); setAllGuests((prev) => [...prev, g]); })
                    .catch((err) => addToast({ type: 'error', message: err.message }))
                }
                nfcAvailable={'NDEFReader' in window}
                onRequestNfcScan={handleNFCScan}
                scanning={scanning}
              />
            )}

            {guest && (
              <>
                <GuestHeader
                  guest={guest}
                  isBlocked={isBlocked}
                  onClose={() => { setGuest(null); setCart([]); }}
                  onToggleLock={toggleGuestLock}
                  lockLoading={lockLoading}
                  onSettle={() => initSettle(guest)}
                />

                {guestOpenOrders?.items?.length > 0 && (
                  <OpenOrdersPanel items={guestOpenOrders.items} total={guestOpenOrders.total} />
                )}

                <ProductGrid
                  products={stationFilteredProducts}
                  onAddToCart={addToCart}
                  isBlocked={isBlocked}
                  categoryFilter={productFilter}
                  onCategoryChange={setProductFilter}
                />
              </>
            )}
          </div>

          {/* Right column: cart (only when a guest is selected) */}
          {guest && (
            <div className="md:w-80 md:flex-shrink-0">
              <OrderCart
                items={cart}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onSubmit={submitOrder}
                submitting={submitting}
                isBlocked={isBlocked}
                guestName={guest?.name}
                orderSuccess={orderSuccess}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== KITCHEN STATION ===== */}
      {station === 'kitchen' && (
        <KitchenView />
      )}

      {/* ===== REGISTER (KASSE) STATION ===== */}
      {station === 'register' && (
        <div className="max-w-5xl mx-auto p-4">
          <RegisterView
            guestOrders={guestOrders}
            settledIds={settledIds}
            onSettle={initSettle}
            loading={registerLoading}
            submitting={submitting}
          />
        </div>
      )}
    </div>
  );
}
