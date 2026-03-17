// NEU: Gastronomie-Seite — iPad/Tablet optimiert, NFC-Scan + Bestellung + Kassen-Ansicht
import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import GuestSelector from '../components/gastro/GuestSelector';
import GuestHeader from '../components/gastro/GuestHeader';
import OpenOrdersPanel from '../components/gastro/OpenOrdersPanel';
import RegisterView from '../components/gastro/RegisterView';
import ProductGrid from '../components/gastro/ProductGrid';
import { useToastStore } from '../store/toasts';
import { useStore } from '../store';

// NEU: Gastronomy Login (nur gastronomy + admin)
function GastronomyLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/auth/login', form);
      if (!['admin', 'gastronomy'].includes(data.user?.role)) {
        setError('Keine Berechtigung für die Gastronomie.');
        return;
      }
      onLogin(data.token);
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const inp = { background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)', minHeight: '64px', borderRadius: '12px', padding: '0 16px', width: '100%', outline: 'none', fontSize: '16px' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'var(--pe-font-body)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.jpeg" alt="DartEvent" style={{ height: '64px', marginBottom: '16px' }} />
          <h1 style={{ background: 'var(--pe-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold', fontSize: '20px' }}>Gastronomie</h1>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Benutzername" style={inp} />
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Passwort" style={inp} />
          {error && <p style={{ color: 'var(--pe-danger)', fontSize: '14px', textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading || !form.username || !form.password} style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', border: 'none', borderRadius: '12px', padding: '16px', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', minHeight: '64px', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Bestätigungs-Dialog vor Abrechnung
function SettleConfirmDialog({ guest, total, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
      <div style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', borderRadius: '16px', padding: '24px', maxWidth: '380px', width: '100%', fontFamily: 'var(--pe-font-body)' }}>
        <h3 style={{ color: 'var(--pe-text)', fontWeight: 'bold', fontSize: '18px', margin: '0 0 8px' }}>Abrechnung bestätigen</h3>
        <p style={{ color: 'var(--pe-text-sub)', fontSize: '14px', margin: '0 0 20px' }}>
          Gast <strong style={{ color: 'var(--pe-text)' }}>{guest.guest_name || guest.name || 'Gast'}</strong> jetzt abrechnen?
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--pe-border)', borderBottom: '1px solid var(--pe-border)', marginBottom: '20px' }}>
          <span style={{ color: 'var(--pe-text-sub)', fontSize: '14px' }}>Gesamtbetrag</span>
          <span style={{ color: 'var(--pe-success)', fontWeight: 'bold', fontSize: '22px' }}>{parseFloat(total || 0).toFixed(2)} EUR</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, minHeight: '64px', borderRadius: '12px', border: '1px solid var(--pe-border)', background: 'var(--pe-bg-elevated)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
            Abbrechen
          </button>
          <button onClick={onConfirm} style={{ flex: 1, minHeight: '64px', borderRadius: '12px', border: 'none', background: 'var(--pe-success)', color: '#000', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
            Abrechnen
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  fontFamily: 'var(--pe-font-body)',
  borderRadius: '12px',
  fontWeight: 'bold',
  border: '1px solid var(--pe-border)',
  cursor: 'pointer',
};

// Station picker — shown when no station is selected yet
function StationPicker({ onSelect }) {
  const stations = [
    {
      id: 'bar',
      label: 'Bar',
      icon: '🍺',
      description: 'Getränke',
      accent: 'var(--pe-cyan-bright)',
      accentBg: 'rgba(0,184,255,0.10)',
      accentBorder: 'rgba(0,184,255,0.35)',
    },
    {
      id: 'kueche',
      label: 'Küche',
      icon: '🍽️',
      description: 'Speisen',
      accent: 'var(--pe-warning)',
      accentBg: 'rgba(255,176,32,0.10)',
      accentBorder: 'rgba(255,176,32,0.35)',
    },
    {
      id: 'kasse',
      label: 'Kasse',
      icon: '💳',
      description: 'Alle Artikel',
      accent: 'var(--pe-success)',
      accentBg: 'rgba(0,229,160,0.10)',
      accentBorder: 'rgba(0,229,160,0.35)',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--pe-bg)',
        fontFamily: 'Verdana, Geneva, sans-serif',
      }}
    >
      <div style={{ marginBottom: '8px', fontSize: '28px', textAlign: 'center' }}>📍</div>
      <h1
        style={{
          color: 'var(--pe-text)',
          fontWeight: 'bold',
          fontSize: '22px',
          margin: '0 0 6px',
          textAlign: 'center',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}
      >
        Station wählen
      </h1>
      <p
        style={{
          color: 'var(--pe-text-sub)',
          fontSize: '14px',
          margin: '0 0 32px',
          textAlign: 'center',
          fontFamily: 'Verdana, Geneva, sans-serif',
        }}
      >
        Wähle deine Station
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {stations.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              minHeight: '130px',
              padding: '20px 24px',
              borderRadius: '16px',
              background: s.accentBg,
              border: `2px solid ${s.accentBorder}`,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'Verdana, Geneva, sans-serif',
              transition: 'transform 0.1s, border-color 0.1s',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <span style={{ fontSize: '42px', lineHeight: 1, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div
                style={{
                  color: s.accent,
                  fontWeight: 'bold',
                  fontSize: '22px',
                  marginBottom: '4px',
                  fontFamily: 'Verdana, Geneva, sans-serif',
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  color: 'var(--pe-text-sub)',
                  fontSize: '13px',
                  fontFamily: 'Verdana, Geneva, sans-serif',
                }}
              >
                {s.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GastronomyPage() {
  const { addToast } = useToastStore();
  const { token, setToken: storeSetToken } = useStore();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  // view state: initialized from URL, and kept in sync reactively via useEffect below
  const [view, setView] = useState(
    tabParam === 'kasse' ? 'register' : tabParam === 'products' ? 'products' : 'order'
  );

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

  // Keep view in sync when user navigates between tabs (URL changes without unmount)
  useEffect(() => {
    setView(tabParam === 'kasse' ? 'register' : tabParam === 'products' ? 'products' : 'order');
  }, [tabParam]);

  // NEU: Bestellungs-Ansicht State
  const [guest, setGuest] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [productFilter, setProductFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Bereits bestellte offene Artikel des Gastes
  const [guestOpenOrders, setGuestOpenOrders] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  // NEU: Armband sperren/entsperren
  const [lockLoading, setLockLoading] = useState(false);

  const [allGuests, setAllGuests] = useState([]);

  const isBlocked = guest != null && (guest.active === 0 || guest.active === false);

  // NEU: Kassen-Ansicht State
  const [guestOrders, setGuestOrders] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  // Bestätigungs-Dialog
  const [settleTarget, setSettleTarget] = useState(null); // { guest_id, guest_name, total }
  // Erfolgsmeldung nach Abrechnung
  const [settledIds, setSettledIds] = useState(new Set());

  // NEU: Produkte + Gäste laden
  useEffect(() => {
    if (!token) return;
    api.get('/products').then(setProducts).catch(() => {});
    api.get('/nfc/guests').then(setAllGuests).catch(() => {});
  }, [token]);

  // NEU: Offene Bestellungen des ausgewählten Gastes laden
  useEffect(() => {
    if (!token) return;
    if (!guest) { setGuestOpenOrders(null); return; }
    api.get(`/orders/guest/${guest.id}`).then(setGuestOpenOrders).catch(() => setGuestOpenOrders(null));
  }, [token, guest]);

  // NEU: NFC-Scan Handler
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

  // NEU: Produkt zum Warenkorb hinzufügen
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  // NEU: Produkt aus Warenkorb entfernen
  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev
        .map((item) => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  // NEU: Bestellung aufgeben
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
      // Offene Bestellungen neu laden
      const updated = await api.get(`/orders/guest/${guest.id}`);
      setGuestOpenOrders(updated);
      setTimeout(() => setOrderSuccess(false), 2000);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Bestellung fehlgeschlagen – bitte erneut versuchen' });
    } finally {
      setSubmitting(false);
    }
  };

  // NEU: Abrechnung einleiten (Dialog öffnen)
  const initSettle = (target) => {
    setSettleTarget(target);
  };

  // NEU: Abrechnung durchführen
  const confirmSettle = async () => {
    if (!settleTarget) return;
    setSubmitting(true);
    const targetId = settleTarget.guest_id || settleTarget.id;
    try {
      await api.post(`/orders/settle/${targetId}`);
      setSettleTarget(null);
      if (view === 'register') {
        setSettledIds(prev => new Set([...prev, targetId]));
        // Kurz anzeigen, dann aus Liste entfernen und neu laden
        setTimeout(() => {
          setSettledIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
          loadRegister();
        }, 2000);
        loadRegister();
      } else {
        // "Bestellung"-Ansicht: Gast zurücksetzen
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

  // NEU: Armband sperren / entsperren
  const toggleGuestLock = async () => {
    if (!guest) return;
    const isBlocked = guest.active === 0 || guest.active === false;
    const endpoint = isBlocked ? `/nfc/${guest.nfc_uid}/activate` : `/nfc/${guest.nfc_uid}/deactivate`;
    setLockLoading(true);
    try {
      const updated = await api.put(endpoint);
      // Merge updated fields back into guest state
      setGuest((prev) => ({ ...prev, ...updated }));
      // Also update allGuests list
      setAllGuests((prev) => prev.map((g) => g.id === guest.id ? { ...g, ...updated } : g));
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Aktion fehlgeschlagen – bitte erneut versuchen' });
    } finally {
      setLockLoading(false);
    }
  };

  // NEU: Kassen-Daten laden
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

  // NEU: Auto-Refresh Kassen-Ansicht alle 10 Sekunden
  useEffect(() => {
    if (!token) return;
    if (view !== 'register') return;
    loadRegister();
    const interval = setInterval(loadRegister, 10000);
    return () => clearInterval(interval);
  }, [token, view, loadRegister]);

  const handleLogin = (newToken) => {
    storeSetToken(newToken);    // Zustand: updates role + localStorage → AppShell nav re-renders with correct tabs
  };

  if (!token) return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--pe-bg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'auto',
    }}>
      <GastronomyLogin onLogin={handleLogin} />
    </div>
  );

  // Show station picker if no station selected yet
  if (station === null) return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'var(--pe-bg)',
      overflow: 'auto',
    }}>
      <StationPicker onSelect={selectStation} />
    </div>
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Station-based category restriction: bar=drink, kueche=food, kasse=all
  const stationCategory = station === 'bar' ? 'drink' : station === 'kueche' ? 'food' : null;

  // Station-level filtering only; ProductGrid handles the categoryFilter tab internally
  const stationFilteredProducts = products.filter((p) => {
    if (!p.available) return false;
    if (stationCategory && p.category !== stationCategory) return false;
    return true;
  });

  // Station badge config
  const stationBadgeConfig = {
    bar:    { label: 'Bar',   icon: '🍺', accent: 'var(--pe-cyan-bright)', accentBg: 'rgba(0,184,255,0.12)', accentBorder: 'rgba(0,184,255,0.35)' },
    kueche: { label: 'Küche', icon: '🍽️', accent: 'var(--pe-warning)',    accentBg: 'rgba(255,176,32,0.12)', accentBorder: 'rgba(255,176,32,0.35)' },
    kasse:  { label: 'Kasse', icon: '💳', accent: 'var(--pe-success)',    accentBg: 'rgba(0,229,160,0.12)', accentBorder: 'rgba(0,229,160,0.35)' },
  };
  const currentBadge = stationBadgeConfig[station];

  return (
    <div className="min-h-screen p-4" style={{ fontFamily: 'Verdana, Geneva, sans-serif' }}>
      {/* Bestätigungs-Dialog */}
      {settleTarget && (
        <SettleConfirmDialog
          guest={settleTarget}
          total={settleTarget.total}
          onConfirm={confirmSettle}
          onCancel={() => setSettleTarget(null)}
        />
      )}

      {/* Station badge */}
      {currentBadge && (
        <div className="max-w-5xl mx-auto mb-4" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '20px',
              background: currentBadge.accentBg,
              border: `1px solid ${currentBadge.accentBorder}`,
              fontFamily: 'Verdana, Geneva, sans-serif',
            }}
          >
            <span style={{ fontSize: '16px' }}>{currentBadge.icon}</span>
            <span style={{ color: currentBadge.accent, fontWeight: 'bold', fontSize: '14px' }}>
              {currentBadge.label}
            </span>
          </div>
          <button
            onClick={clearStation}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1px solid var(--pe-border)',
              background: 'var(--pe-bg-elevated)',
              color: 'var(--pe-text-sub)',
              fontFamily: 'Verdana, Geneva, sans-serif',
              fontSize: '12px',
              cursor: 'pointer',
              minHeight: '64px',
            }}
          >
            Station wechseln
          </button>
        </div>
      )}

      {/* NEU: View-Toggle — Bestellung | Kasse */}
      <div className="flex gap-2 mb-6 max-w-5xl mx-auto">
        <button
          onClick={() => setView('order')}
          style={{
            ...btnStyle,
            flex: 1,
            minHeight: '64px',
            fontSize: '16px',
            background: view === 'order' ? 'var(--pe-blue-deep)' : 'var(--pe-bg-card)',
            color: view === 'order' ? 'var(--pe-text)' : 'var(--pe-text-sub)',
          }}
        >
          Bestellung
        </button>
        <button
          onClick={() => setView('register')}
          style={{
            ...btnStyle,
            flex: 1,
            minHeight: '64px',
            fontSize: '16px',
            background: view === 'register' ? 'var(--pe-blue-deep)' : 'var(--pe-bg-card)',
            color: view === 'register' ? 'var(--pe-text)' : 'var(--pe-text-sub)',
          }}
        >
          Kasse
        </button>
      </div>

      {/* ===== BESTELLUNGS-ANSICHT (Servicekraft) ===== */}
      {view === 'order' && (
        <div className="max-w-5xl mx-auto">
          {!guest && (
            <GuestSelector
              guests={allGuests}
              onGuestSelect={(g) => { setGuest(g); setCart([]); setOrderSuccess(false); }}
              onCreateGuest={(name) => api.post('/nfc/create-manual', { name })
                .then((g) => { setGuest(g); setCart([]); setAllGuests((prev) => [...prev, g]); })
                .catch((err) => addToast({ type: 'error', message: err.message }))}
              nfcAvailable={'NDEFReader' in window}
              onRequestNfcScan={handleNFCScan}
              scanning={scanning}
            />
          )}

          {guest && (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* NEU: Linke Seite — Gast-Info + offene Bestellungen + Produkte */}
              <div className="flex-1">
                {/* Gast-Header */}
                <GuestHeader
                  guest={guest}
                  isBlocked={isBlocked}
                  onClose={() => { setGuest(null); setCart([]); }}
                  onToggleLock={toggleGuestLock}
                  lockLoading={lockLoading}
                  onSettle={() => initSettle(guest)}
                />

                {/* Bereits offene Bestellungen dieses Gastes */}
                {guestOpenOrders?.items?.length > 0 && (
                  <OpenOrdersPanel items={guestOpenOrders.items} total={guestOpenOrders.total} />
                )}

                {/* Product grid with category filter */}
                <ProductGrid
                  products={stationFilteredProducts}
                  onAddToCart={addToCart}
                  isBlocked={isBlocked}
                  categoryFilter={productFilter}
                  onCategoryChange={setProductFilter}
                />
              </div>

              {/* NEU: Rechte Seite — Warenkorb (nur Bestellen, kein Abrechnen) */}
              <div className="lg:w-80">
                <div className="p-4 rounded-xl" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--pe-text-sub)' }}>
                    Warenkorb ({cart.reduce((s, i) => s + i.quantity, 0)})
                  </h3>

                  {cart.length === 0 && (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--pe-text-muted)' }}>
                      {orderSuccess ? '✓ Bestellung gespeichert' : 'Leer — Artikel tippen zum Hinzufügen'}
                    </p>
                  )}

                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {cart.map((item) => (
                      <div key={item.product_id} className="flex justify-between items-center text-sm">
                        <span style={{ color: 'var(--pe-text)' }}>{item.name} x{item.quantity}</span>
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--pe-text-sub)' }}>{(item.price * item.quantity).toFixed(2)} €</span>
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--pe-bg-elevated)', color: 'var(--pe-danger)', fontFamily: 'var(--pe-font-body)', width: '44px', height: '44px', minWidth: '44px', padding: '10px', boxSizing: 'content-box' }}
                          >
                            -
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {cart.length > 0 && (
                    <div className="flex justify-between items-center mb-4 pt-3" style={{ borderTop: '1px solid var(--pe-border)' }}>
                      <span className="font-bold" style={{ color: 'var(--pe-text)' }}>Summe:</span>
                      <span className="font-bold text-lg" style={{ color: 'var(--pe-cyan-bright)' }}>{cartTotal.toFixed(2)} €</span>
                    </div>
                  )}

                  <button
                    onClick={submitOrder}
                    disabled={cart.length === 0 || submitting || isBlocked}
                    className="w-full py-4 rounded-xl font-bold text-lg disabled:opacity-50"
                    style={{ background: isBlocked ? 'var(--pe-bg-elevated)' : 'var(--pe-gradient)', color: isBlocked ? 'var(--pe-danger)' : 'var(--pe-text)', minHeight: '64px', fontFamily: 'var(--pe-font-body)', border: isBlocked ? '1px solid var(--pe-danger)' : 'none', cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                  >
                    {isBlocked ? 'Armband gesperrt' : submitting ? 'Wird gespeichert...' : 'Bestellen'}
                  </button>

                  {orderSuccess && cart.length === 0 && (
                    <p className="text-center mt-3 text-sm font-bold" style={{ color: 'var(--pe-success)' }}>✓ Bestellung gespeichert!</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== KASSEN-ANSICHT (Kassier) ===== */}
      {view === 'register' && (
        <div className="max-w-5xl mx-auto">
          <RegisterView
            guestOrders={guestOrders}
            settledIds={settledIds}
            onSettle={initSettle}
            loading={registerLoading}
          />
        </div>
      )}
    </div>
  );
}
