import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import PlayerRegistrationPage from './pages/PlayerRegistrationPage';
import NFCScanPage from './pages/NFCScanPage';
import OrderPage from './pages/OrderPage';
import AdminPage from './pages/AdminPage';
// NEU: Board-Ansicht importieren
import CurrentGameView from './pages/CurrentGameView';
import { parseJwt } from './lib/parseJwt';

// NEU: Lazy imports für Seiten die von frontend-referee-admin erstellt werden
const RefereePage = lazy(() => import('./pages/RefereePage'));
const GastronomyPage = lazy(() => import('./pages/GastronomyPage'));
const CancelRegistrationPage = lazy(() => import('./pages/CancelRegistrationPage'));

// NEU: Protected Route mit Rollenprüfung
function ProtectedRoute({ element, roles }) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const payload = parseJwt(token);
  if (!payload || (roles && !roles.includes(payload.role))) return null;
  return element;
}

// NEU: Fallback-Spinner für lazy-geladene Seiten
function LazyFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pe-text-sub)' }}>
      Laden...
    </div>
  );
}

const CONFIG_TO_CSS = {
  color_primary:      '--pe-blue-deep',
  color_mid:          '--pe-blue-mid',
  color_accent:       '--pe-cyan-bright',
  color_accent_light: '--pe-cyan-light',
  color_bg:           '--pe-bg',
  color_bg_card:      '--pe-bg-card',
  color_success:      '--pe-success',
  color_warning:      '--pe-warning',
  color_danger:       '--pe-danger',
};

export function applyTheme(cfg) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CONFIG_TO_CSS)) {
    if (cfg[key]) root.style.setProperty(cssVar, cfg[key]);
  }
  const p = cfg.color_accent_light || '#5DD5FF';
  const m = cfg.color_mid || '#1E7FEB';
  const d = cfg.color_primary || '#1A4FD6';
  root.style.setProperty('--pe-gradient', `linear-gradient(135deg, ${p}, ${m}, ${d})`);
  if (cfg.app_name) document.title = cfg.app_name;
}

function ThemeLoader() {
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(applyTheme)
      .catch(() => {});
  }, []);
  return null;
}

export default function App() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <ThemeLoader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/tournament/:id/register" element={<PlayerRegistrationPage />} />
        <Route path="/nfc" element={<NFCScanPage />} />
        {/* NEU: NFC-Scan alternative Route */}
        <Route path="/nfc-scan" element={<NFCScanPage />} />
        <Route path="/orders/:uid" element={<OrderPage />} />
        {/* NEU: Board-Ansicht für Beamer/TV (öffentlich) */}
        <Route path="/board/:boardId" element={<CurrentGameView />} />
        {/* Admin Users Tab — AdminPage hat eigenen Login */}
        <Route path="/admin/users" element={<AdminPage tab="users" />} />
        {/* NEU: Referee-Seite (eigener Login auf der Seite) */}
        <Route path="/referee/:boardId" element={<RefereePage />} />
        {/* NEU: Gastronomy Routen (eigener Login auf der Seite) */}
        <Route path="/gastronomy" element={<GastronomyPage />} />
        {/* Spieler-Abmeldung via Token-Link */}
        <Route path="/cancel/:token" element={<CancelRegistrationPage />} />
        {/* Admin — AdminPage hat eigenen Login */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}
