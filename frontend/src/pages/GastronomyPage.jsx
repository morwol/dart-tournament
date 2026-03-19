// GastronomyPage — station-split architecture
// Stations: 'bar' (drinks + ordering), 'register' (settle)
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import GastronomyLogin from '../components/gastro/GastronomyLogin';
import StationSelector from '../components/gastro/StationSelector';
import RegisterView from '../components/gastro/RegisterView';
import GuestSelector from '../components/gastro/GuestSelector';
import GuestHeader from '../components/gastro/GuestHeader';
import OpenOrdersPanel from '../components/gastro/OpenOrdersPanel';
import ProductGrid from '../components/gastro/ProductGrid';
import SessionOrderList from '../components/gastro/SessionOrderList';
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
  const [sessionOrders, setSessionOrders] = useState([]);
  const [productFilter, setProductFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestOpenOrders, setGuestOpenOrders] = useState(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [allGuests, setAllGuests] = useState([]);
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const timerRef = useRef(null);

  const isBlocked = guest != null && (guest.active === 0 || guest.active === false);

  // Register (Kasse) state
  const [guestOrders, setGuestOrders] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [settledIds, setSettledIds] = useState(new Set());

  // Settle dialog
  const [settleTarget, setSettleTarget] = useState(null);

  // Session management — 20s inactivity timer
  const clearSession = useCallback(() => {
    clearTimeout(timerRef.current);
    setGuest(null);
    setSessionOrders([]);
    setGuestOpenOrders(null);
    setProductFilter('all');
  }, []);

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(clearSession, 20000);
  }, [clearSession]);

  const selectGuest = useCallback((g) => {
    setGuest(g);
    setSessionOrders([]);
    setGuestOpenOrders(null);
    resetTimer();
  }, [resetTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // Load products + all guests once token is available
  useEffect(() => {
    if (!token) return;
    api.get('/products').then(setProducts).catch(() => {});
    api.get('/nfc/guests').then(setAllGuests).catch(() => {});
    api.get('/tournaments/active').then((t) => { if (t?.id) setActiveTournamentId(t.id); }).catch(() => {});
  }, [token]);

  // Fetch open orders for a guest
  const fetchGuestOpenOrders = useCallback(async (guestId) => {
    try {
      const data = await api.get(`/orders/guest/${guestId}`);
      setGuestOpenOrders(data);
    } catch {
      setGuestOpenOrders(null);
    }
  }, []);

  // Load open orders for the currently selected guest
  useEffect(() => {
    if (!token) return;
    if (!guest) { setGuestOpenOrders(null); return; }
    fetchGuestOpenOrders(guest.id);
  }, [token, guest, fetchGuestOpenOrders]);

  // NFC scan handler
  const handleNFCScan = async (uid) => {
    setScanning(true);
    try {
      const result = await api.post('/nfc/scan', { uid });
      selectGuest(result);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Gast nicht gefunden' });
    } finally {
      setScanning(false);
    }
  };

  // Tap-to-order: immediately post order on product tap
  const tapProduct = useCallback(async (product) => {
    resetTimer();
    try {
      const order = await api.post('/orders', {
        guest_uid: guest.nfc_uid,
        product_id: product.id,
        quantity: 1,
      });
      setSessionOrders(prev => [...prev, order]);
    } catch (err) {
      addToast({ type: 'error', message: 'Fehler beim Buchen' });
    }
  }, [guest, resetTimer, addToast]);

  // Undo last tap — delete order if still open
  const tapUndo = useCallback(async (orderId) => {
    resetTimer();
    try {
      await api.delete(`/orders/${orderId}`);
      setSessionOrders(prev => prev.filter(o => o.id !== orderId));
      if (guest) fetchGuestOpenOrders(guest.id);
    } catch (err) {
      if (err.status === 404) {
        addToast({ type: 'error', message: 'Bereits abgerechnet — kann nicht entfernt werden' });
      } else {
        addToast({ type: 'error', message: 'Rückgängig nicht möglich' });
      }
    }
  }, [guest, resetTimer, addToast, fetchGuestOpenOrders]);

  // Category filter — also resets inactivity timer
  const handleCategoryChange = useCallback((cat) => {
    setProductFilter(cat);
    resetTimer();
  }, [resetTimer]);

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
        // Bar station: reset session after settling
        setGuest(null);
        setGuestOpenOrders(null);
        setSessionOrders([]);
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
  // 'bar' shows drinks only, 'register' shows all available
  const stationCategory = station === 'bar' ? 'drink' : null;
  const stationFilteredProducts = products.filter((p) => {
    if (!p.available) return false;
    if (stationCategory && p.category !== stationCategory) return false;
    return true;
  });

  // Derive session counts per product for tap feedback
  const sessionCounts = sessionOrders.reduce((map, o) => {
    map.set(o.product_id, (map.get(o.product_id) || 0) + 1);
    return map;
  }, new Map());

  // Station badge config
  const badgeConfig = {
    bar:      { label: 'Bar',   icon: '🍺', accent: 'var(--pe-cyan-bright)', accentBg: 'rgba(0,184,255,0.12)', accentBorder: 'rgba(0,184,255,0.35)' },
    register: { label: 'Kasse', icon: '💳', accent: 'var(--pe-success)',     accentBg: 'rgba(0,229,160,0.12)',  accentBorder: 'rgba(0,229,160,0.35)' },
  };
  const badge = badgeConfig[station];

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--pe-font-body)' }}>
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
          margin: '0 0 4px',
        }}
      >
        {badge && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: 'var(--pe-radius-xl)',
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
            borderRadius: 'var(--pe-radius-md)',
            color: 'var(--pe-text-sub)',
            fontFamily: 'var(--pe-font-body)',
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
        <div style={{ width: '100%', padding: 16 }}>
          {!guest && (
            <GuestSelector
              guests={allGuests}
              onGuestSelect={selectGuest}
              onCreateGuest={(name) => {
                const payload = { name };
                if (activeTournamentId) payload.tournament_id = activeTournamentId;
                return api.post('/nfc/create-manual', payload)
                  .then((g) => { selectGuest(g); setAllGuests((prev) => [...prev, g]); })
                  .catch((err) => addToast({ type: 'error', message: err.message }));
              }}
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
                onClose={clearSession}
                onToggleLock={toggleGuestLock}
                lockLoading={lockLoading}
                onSettle={() => initSettle(guest)}
              />

              {guestOpenOrders?.items?.length > 0 && (
                <OpenOrdersPanel items={guestOpenOrders.items} total={guestOpenOrders.total} />
              )}

              <ProductGrid
                products={stationFilteredProducts}
                onTap={tapProduct}
                sessionCounts={sessionCounts}
                isBlocked={isBlocked}
                categoryFilter={productFilter}
                onCategoryChange={handleCategoryChange}
              />

              <SessionOrderList orders={sessionOrders} onUndo={tapUndo} />
            </>
          )}
        </div>
      )}

      {/* ===== REGISTER (KASSE) STATION ===== */}
      {station === 'register' && (
        <div style={{ width: '100%', padding: 16 }}>
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
