import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import PlayerRegistrationPage from './pages/PlayerRegistrationPage';
import NFCScanPage from './pages/NFCScanPage';
import OrderPage from './pages/OrderPage';
import AdminPage from './pages/AdminPage';
import LoginSelectionPage from './pages/LoginSelectionPage';
// NEU: Board-Ansicht importieren
import CurrentGameView from './pages/CurrentGameView';
import AppShell from './components/AppShell';
import { parseJwt } from './lib/parseJwt';
import Toaster from './components/Toaster';

// NEU: Lazy imports für Seiten die von frontend-referee-admin erstellt werden
const RefereePage = lazy(() => import('./pages/RefereePage'));
const GastronomyPage = lazy(() => import('./pages/GastronomyPage'));
const CancelRegistrationPage = lazy(() => import('./pages/CancelRegistrationPage'));
const RefereeEntryPage = lazy(() => import('./pages/RefereeEntryPage'));

// NEU: Protected Route mit Rollenprüfung
function ProtectedRoute({ element, roles }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  const payload = parseJwt(token);
  if (!payload || (roles && !roles.includes(payload.role))) return <Navigate to="/" replace />;
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
    <>
      <Toaster />
      <Suspense fallback={<LazyFallback />}>
        <ThemeLoader />
        <Routes>
          {/* ── Shell routes: TopBar + role nav ── */}
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tournament/:id" element={<TournamentPage />} />
            <Route path="/tournament/:id/register" element={<PlayerRegistrationPage />} />
            <Route path="/gastronomy" element={<GastronomyPage />} />
            <Route path="/login" element={<LoginSelectionPage />} />
            {/* AdminPage has its own AdminLogin gate — no ProtectedRoute needed */}
            <Route path="/admin" element={<AdminPage />} />
            {/* /admin/users → redirect to /admin?tab=users */}
            <Route path="/admin/users" element={<Navigate to="/admin?tab=users" replace />} />
          </Route>

          {/* ── Standalone routes: no shell ── */}
          {/* /referee: login = no TopBar; board picker = TopBar only (RefereeEntryPage renders it) */}
          <Route path="/referee" element={<RefereeEntryPage />} />
          <Route path="/referee/:boardId" element={<RefereePage />} />
          <Route path="/board/:boardId" element={<CurrentGameView />} />
          <Route path="/nfc" element={<NFCScanPage />} />
          <Route path="/nfc-scan" element={<NFCScanPage />} />
          <Route path="/orders/:uid" element={<OrderPage />} />
          <Route path="/cancel/:token" element={<CancelRegistrationPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
