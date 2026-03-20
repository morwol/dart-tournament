// GastronomyPage — station-split architecture
// Stations: 'bar' (drinks + ordering), 'register' (settle)
// Auth is handled by ProtectedRoute in App.jsx — no inline login gate here.
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import StationSelector from '../components/gastro/StationSelector';
import RegisterView from '../components/gastro/RegisterView';
import GuestSelector from '../components/gastro/GuestSelector';
import GuestHeader from '../components/gastro/GuestHeader';
import OpenOrdersPanel from '../components/gastro/OpenOrdersPanel';
import ProductGrid from '../components/gastro/ProductGrid';
import SessionOrderList from '../components/gastro/SessionOrderList';
import SettleDialog from '../components/gastro/SettleDialog';
import { useToastStore } from '../store/toasts';

export default function GastronomyPage() {
  const { addToast } = useToastStore();

  // Tablet detection — responsive breakpoint at 768px
  const [isTablet, setIsTablet] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const h = (e) => setIsTablet(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

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

  // Load products + all guests on mount
  useEffect(() => {
    api.get('/products').then(setProducts).catch(() => {});
    api.get('/nfc/guests').then(setAllGuests).catch(() => {});
    api.get('/tournaments/active').then((t) => { if (t?.id) setActiveTournamentId(t.id); }).catch(() => {});
  }, []);

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
    if (!guest) { setGuestOpenOrders(null); return; }
    fetchGuestOpenOrders(guest.id);
  }, [guest, fetchGuestOpenOrders]);

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
    if (station !== 'register') return;
    loadRegister();
    const interval = setInterval(loadRegister, 10000);
    return () => clearInterval(interval);
  }, [station, loadRegister]);

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

  // Category sidebar items for tablet bar layout
  const sidebarCategories = [
    { id: 'all',   label: 'Alle',      icon: '⊞' },
    { id: 'drink', label: 'Getraenke', icon: '🍺' },
    { id: 'food',  label: 'Speisen',   icon: '🍕' },
  ];

  return (
    <div style={{ fontFamily: 'var(--pe-font-body)', minHeight: '100vh', background: 'var(--pe-bg)' }}>
      {/* Settle confirmation dialog — rendered at top level so it works from any station */}
      {settleTarget && (
        <SettleDialog
          guest={settleTarget}
          total={settleTarget.total}
          onConfirm={confirmSettle}
          onCancel={() => setSettleTarget(null)}
        />
      )}

      {/* Station switcher: both chips side by side, active one highlighted */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          margin: '0 0 4px',
        }}
      >
        {Object.entries(badgeConfig).map(([key, cfg]) => {
          const isActive = station === key;
          return (
            <button
              key={key}
              onClick={() => selectStation(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '64px',
                padding: '0 24px',
                borderRadius: 'var(--pe-radius-xl)',
                background: isActive ? cfg.accentBg : 'var(--pe-bg-elevated)',
                border: `1px solid ${isActive ? cfg.accentBorder : 'var(--pe-border)'}`,
                color: isActive ? cfg.accent : 'var(--pe-text-muted)',
                fontFamily: 'var(--pe-font-body)',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: isActive ? 'default' : 'pointer',
                opacity: isActive ? 1 : 0.6,
                transition: 'opacity 0.15s, border-color 0.15s',
              }}
            >
              <span style={{ fontSize: '18px' }}>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== BAR STATION ===== */}
      {station === 'bar' && (
        <>
          {/* Guest selector — shown full-width when no guest is active */}
          {!guest && (
            <div style={{ padding: '0 16px 16px' }}>
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
            </div>
          )}

          {guest && (
            <>
              {/* Guest header — full-width above the layout panels */}
              <div style={{ padding: '0 16px 8px' }}>
                <GuestHeader
                  guest={guest}
                  isBlocked={isBlocked}
                  onClose={clearSession}
                  onToggleLock={toggleGuestLock}
                  lockLoading={lockLoading}
                  onSettle={() => initSettle(guest)}
                />
              </div>

              {/* Tablet: three-panel layout. Mobile: single-column flow */}
              <div
                style={{
                  display: isTablet ? 'grid' : 'flex',
                  gridTemplateColumns: isTablet ? '200px 1fr 280px' : undefined,
                  flexDirection: isTablet ? undefined : 'column',
                  height: isTablet ? 'calc(100vh - 160px)' : undefined,
                  overflow: 'hidden',
                }}
              >
                {/* LEFT panel: category sidebar (tablet only) */}
                {isTablet && (
                  <div
                    style={{
                      background: 'var(--pe-bg-elevated)',
                      borderRight: '1px solid var(--pe-border)',
                      overflowY: 'auto',
                      padding: '8px 0',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {sidebarCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        style={{
                          width: '100%',
                          minHeight: '52px',
                          padding: '12px 16px',
                          textAlign: 'left',
                          background: productFilter === cat.id ? 'var(--pe-bg-card)' : 'transparent',
                          borderTop: 'none',
                          borderRight: 'none',
                          borderBottom: '1px solid var(--pe-border)',
                          borderLeft: productFilter === cat.id
                            ? '3px solid var(--pe-cyan-bright)'
                            : '3px solid transparent',
                          color: productFilter === cat.id ? 'var(--pe-cyan-bright)' : 'var(--pe-text-sub)',
                          cursor: 'pointer',
                          fontFamily: 'var(--pe-font-body)',
                          fontSize: '13px',
                          fontWeight: productFilter === cat.id ? 'bold' : 'normal',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* CENTER panel: open orders summary (mobile only) + product grid */}
                <div
                  style={{
                    overflowY: 'auto',
                    padding: isTablet ? '12px' : '0 16px',
                    flex: isTablet ? undefined : 1,
                  }}
                >
                  {/* Open orders accordion — mobile only (tablet shows in right panel) */}
                  {!isTablet && guestOpenOrders?.items?.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <OpenOrdersPanel items={guestOpenOrders.items} total={guestOpenOrders.total} />
                    </div>
                  )}

                  <ProductGrid
                    products={stationFilteredProducts}
                    onTap={tapProduct}
                    sessionCounts={sessionCounts}
                    isBlocked={isBlocked}
                    categoryFilter={productFilter}
                    onCategoryChange={handleCategoryChange}
                    isTablet={isTablet}
                  />

                  {/* Session order list below grid on mobile */}
                  {!isTablet && (
                    <SessionOrderList orders={sessionOrders} onUndo={tapUndo} />
                  )}
                </div>

                {/* RIGHT panel: order summary (tablet only) */}
                {isTablet && (
                  <div
                    style={{
                      background: 'var(--pe-bg-card)',
                      borderLeft: '1px solid var(--pe-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Open orders section */}
                    {guestOpenOrders?.items?.length > 0 && (
                      <div style={{ padding: '12px', borderBottom: '1px solid var(--pe-border)' }}>
                        <p style={{
                          margin: '0 0 8px',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          color: 'var(--pe-text-muted)',
                          fontWeight: 'bold',
                          letterSpacing: '0.05em',
                          fontFamily: 'var(--pe-font-body)',
                        }}>
                          Offene Bestellungen
                        </p>
                        <OpenOrdersPanel items={guestOpenOrders.items} total={guestOpenOrders.total} />
                      </div>
                    )}

                    {/* Session orders — fills remaining space */}
                    <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column' }}>
                      <p style={{
                        margin: '0 0 8px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        color: 'var(--pe-text-muted)',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                        fontFamily: 'var(--pe-font-body)',
                      }}>
                        Diese Bestellung
                      </p>

                      {sessionOrders.length === 0 ? (
                        <p style={{
                          color: 'var(--pe-text-muted)',
                          fontSize: '13px',
                          textAlign: 'center',
                          padding: '24px 0',
                          fontFamily: 'var(--pe-font-body)',
                        }}>
                          Noch nichts bestellt
                        </p>
                      ) : (
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                          <SessionOrderList orders={sessionOrders} onUndo={tapUndo} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ===== REGISTER (KASSE) STATION ===== */}
      {station === 'register' && (
        <div
          style={{
            width: '100%',
            padding: isTablet ? '16px 24px' : '16px',
            maxWidth: isTablet ? '960px' : undefined,
            margin: isTablet ? '0 auto' : undefined,
          }}
        >
          <RegisterView
            guestOrders={guestOrders}
            settledIds={settledIds}
            onSettle={initSettle}
            loading={registerLoading}
            submitting={submitting}
            isTablet={isTablet}
          />
        </div>
      )}
    </div>
  );
}
