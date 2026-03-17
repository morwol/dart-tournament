// NEU: Gastronomie-Seite — iPad/Tablet optimiert, NFC-Scan + Bestellung + Kassen-Ansicht
import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import NFCScanner from '../components/nfc/NFCScanner';
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
  const [guestSearch, setGuestSearch] = useState('');
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

  const filteredProducts = products.filter((p) => {
    if (!p.available) return false;
    // Apply station restriction first
    if (stationCategory && p.category !== stationCategory) return false;
    // Then apply manual tab filter (but only if it makes sense given the station)
    if (productFilter !== 'all' && p.category !== productFilter) return false;
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
            <>
              {/* NFC-Scan */}
              <NFCScanner onScan={handleNFCScan} scanning={scanning} />

              {/* Gäste-Liste (Fallback ohne NFC) */}
              <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}>
                <p style={{ color: 'var(--pe-text-sub)', fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>GAST AUSWÄHLEN</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Name suchen..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)', color: 'var(--pe-text)', fontFamily: 'var(--pe-font-body)', minHeight: '64px', outline: 'none' }}
                  />
                  <button
                    onClick={() => {
                      api.post('/nfc/create-manual', { name: guestSearch.trim() || 'Neuer Gast' })
                        .then((g) => { setGuest(g); setCart([]); setGuestSearch(''); setAllGuests(prev => [...prev, g]); })
                        .catch((err) => addToast({ type: 'error', message: err.message || 'Gast konnte nicht angelegt werden' }));
                    }}
                    style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--pe-blue-mid)', color: 'var(--pe-text)', border: 'none', fontFamily: 'var(--pe-font-body)', fontWeight: 'bold', cursor: 'pointer', minHeight: '64px', whiteSpace: 'nowrap' }}
                  >
                    + Neu
                  </button>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {allGuests
                    .filter((g) => !guestSearch || g.name?.toLowerCase().includes(guestSearch.toLowerCase()))
                    .map((g) => {
                      const gBlocked = g.active === 0 || g.active === false;
                      return (
                        <button
                          key={g.id}
                          onClick={() => { setGuest(g); setCart([]); setOrderSuccess(false); }}
                          style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--pe-bg-card)', border: `1px solid ${gBlocked ? 'var(--pe-danger)' : 'var(--pe-border)'}`, color: 'var(--pe-text)', textAlign: 'left', fontFamily: 'var(--pe-font-body)', cursor: 'pointer', minHeight: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ fontWeight: 'bold' }}>{g.name || 'Gast'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {gBlocked && (
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--pe-danger)', border: '1px solid var(--pe-danger)', borderRadius: '20px', padding: '2px 8px' }}>Gesperrt</span>
                            )}
                            <span style={{ color: 'var(--pe-text-muted)', fontSize: '12px' }}>#{g.id}</span>
                          </div>
                        </button>
                      );
                    })
                  }
                  {allGuests.length === 0 && (
                    <p style={{ color: 'var(--pe-text-muted)', textAlign: 'center', padding: '16px', fontSize: '13px' }}>Noch keine Gäste. Mit "+ Neu" ersten Gast anlegen.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {guest && (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* NEU: Linke Seite — Gast-Info + offene Bestellungen + Produkte */}
              <div className="flex-1">
                {/* Gast-Header */}
                {/* Gast-Header */}
                <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--pe-bg-card)', border: `1px solid ${isBlocked ? 'var(--pe-danger)' : 'var(--pe-border)'}` }}>
                      {/* Zeile 1: Name + Badge + Schließen */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <div>
                            <p style={{ fontWeight: 'bold', color: 'var(--pe-text)', margin: 0, fontSize: '15px' }}>{guest.name || 'Gast'}</p>
                            <p style={{ fontSize: '11px', color: 'var(--pe-text-muted)', margin: '2px 0 0' }}>#{guest.id}</p>
                          </div>
                          {/* Status-Badge */}
                          <span
                            style={{
                              flexShrink: 0,
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: isBlocked ? 'var(--pe-danger)' : 'var(--pe-success)',
                              border: `1px solid ${isBlocked ? 'var(--pe-danger)' : 'var(--pe-success)'}`,
                              background: isBlocked ? 'rgba(255,69,96,0.12)' : 'rgba(0,229,160,0.10)',
                            }}
                          >
                            {isBlocked ? 'Gesperrt' : 'Aktiv'}
                          </span>
                        </div>
                        <button
                          onClick={() => { setGuest(null); setCart([]); setGuestOpenOrders(null); }}
                          style={{ ...btnStyle, minHeight: '64px', padding: '0 16px', background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', border: '1px solid var(--pe-border)', flexShrink: 0 }}
                        >
                          ✕ Schließen
                        </button>
                      </div>
                      {/* Zeile 2: Sperren/Entsperren */}
                      <button
                        onClick={toggleGuestLock}
                        disabled={lockLoading}
                        style={{
                          ...btnStyle,
                          width: '100%',
                          minHeight: '64px',
                          background: isBlocked ? 'rgba(0,229,160,0.12)' : 'rgba(255,69,96,0.12)',
                          color: isBlocked ? 'var(--pe-success)' : 'var(--pe-danger)',
                          border: `1px solid ${isBlocked ? 'var(--pe-success)' : 'var(--pe-danger)'}`,
                          fontSize: '13px',
                          opacity: lockLoading ? 0.6 : 1,
                        }}
                      >
                        {lockLoading
                          ? (isBlocked ? 'Wird entsperrt...' : 'Wird gesperrt...')
                          : (isBlocked ? 'Armband entsperren' : 'Armband sperren')}
                      </button>
                      {/* Hinweis wenn gesperrt */}
                      {isBlocked && (
                        <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--pe-danger)', fontWeight: 'bold', textAlign: 'center' }}>
                          Armband gesperrt — keine Bestellungen möglich
                        </p>
                      )}
                </div>

                {/* Bereits offene Bestellungen dieses Gastes */}
                {guestOpenOrders && guestOpenOrders.items?.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Offene Bestellungen</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase' }}>Artikel</th>
                          <th style={{ textAlign: 'center', padding: '4px 8px', fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', width: '48px' }}>Menge</th>
                          <th style={{ textAlign: 'right', padding: '4px 8px', fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', width: '80px' }}>Preis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guestOpenOrders.items.map((item, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--pe-border)' }}>
                            <td style={{ padding: '7px 8px', fontSize: '13px', color: 'var(--pe-text)' }}>{item.product_name}</td>
                            <td style={{ padding: '7px 8px', fontSize: '13px', color: 'var(--pe-text)', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ padding: '7px 8px', fontSize: '13px', color: 'var(--pe-text-sub)', textAlign: 'right' }}>{parseFloat(item.total).toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--pe-border)' }}>
                          <td colSpan="2" style={{ padding: '7px 8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--pe-text-sub)' }}>Gesamt offen</td>
                          <td style={{ padding: '7px 8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--pe-cyan-bright)', textAlign: 'right' }}>{parseFloat(guestOpenOrders.total || 0).toFixed(2)} €</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Kategorien-Tabs */}
                <div className="flex gap-2 mb-3">
                  {[{ id: 'all', label: 'Alle' }, { id: 'drink', label: 'Getränke' }, { id: 'food', label: 'Speisen' }].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setProductFilter(cat.id)}
                      style={{
                        ...btnStyle,
                        padding: '8px 16px',
                        minHeight: '64px',
                        background: productFilter === cat.id ? 'var(--pe-blue-deep)' : 'var(--pe-bg-elevated)',
                        color: productFilter === cat.id ? 'var(--pe-text)' : 'var(--pe-text-sub)',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Produkt-Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3" style={{ opacity: isBlocked ? 0.4 : 1, pointerEvents: isBlocked ? 'none' : undefined }}>
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isBlocked}
                      className="flex flex-col items-center justify-center p-3"
                      style={{ ...btnStyle, minHeight: '80px', background: 'var(--pe-bg-card)', color: 'var(--pe-text)' }}
                    >
                      <span className="text-sm font-bold mb-1">{product.name}</span>
                      <span className="text-xs" style={{ color: 'var(--pe-cyan-bright)' }}>{parseFloat(product.price).toFixed(2)} €</span>
                    </button>
                  ))}
                </div>
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
          {registerLoading && guestOrders.length === 0 && (
            <p className="text-center" style={{ color: 'var(--pe-text-sub)' }}>Lade Bestellungen...</p>
          )}

          {/* Liste aller Gäste mit offenen Bestellungen */}
          <div className="space-y-3">
            {guestOrders.map((g) => {
              const isJustSettled = settledIds.has(g.guest_id);
              return (
                <div
                  key={g.guest_id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: isJustSettled ? 'rgba(0,229,160,0.08)' : 'var(--pe-bg-card)',
                    border: isJustSettled ? '1px solid var(--pe-success)' : '1px solid var(--pe-border)',
                    transition: 'all 0.3s',
                  }}
                >
                  {/* Gast-Header */}
                  <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pe-border)' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--pe-text)' }}>{g.guest_name || 'Gast'}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: isJustSettled ? 'var(--pe-success)' : 'var(--pe-cyan-bright)' }}>
                      {isJustSettled ? '✓ Abgerechnet' : `${parseFloat(g.total || 0).toFixed(2)} €`}
                    </span>
                  </div>

                  {/* Artikel-Tabelle */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 16px', fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Artikel</th>
                        <th style={{ textAlign: 'center', padding: '8px 16px', fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '64px' }}>Menge</th>
                        <th style={{ textAlign: 'right', padding: '8px 16px', fontSize: '11px', color: 'var(--pe-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '96px' }}>Preis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(g.items || []).map((item, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--pe-border)' }}>
                          <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--pe-text)' }}>{item.product_name}</td>
                          <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--pe-text)', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--pe-text-sub)', textAlign: 'right', whiteSpace: 'nowrap' }}>{parseFloat(item.total).toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Jetzt-abrechnen Button */}
                  {!isJustSettled && (
                    <div style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => initSettle(g)}
                        disabled={submitting}
                        style={{ ...btnStyle, width: '100%', minHeight: '64px', background: 'var(--pe-success)', color: '#000', border: 'none', fontSize: '15px' }}
                      >
                        Jetzt abrechnen
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {!registerLoading && guestOrders.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--pe-text-muted)' }}>Keine offenen Bestellungen</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
