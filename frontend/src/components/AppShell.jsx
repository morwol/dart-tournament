// frontend/src/components/AppShell.jsx
import { Outlet } from 'react-router-dom';
import { useStore } from '../store';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import TopNav from './TopNav';

export default function AppShell() {
  const role = useStore(s => s.role);
  const isRailRole = role === 'admin' || role === 'director';

  if (role === 'gastronomy') {
    // Gastronomy: full-screen, no shell — page handles its own logout
    return (
      <div style={{ minHeight: '100vh', background: 'var(--pe-bg)' }}>
        <Outlet />
      </div>
    );
  }

  if (isRailRole) {
    // Rail layout: nav left, content right (no TopBar or BottomNav)
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--pe-bg)' }}>
        <TopNav />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    );
  }

  // Standard column layout for all other roles
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar />
      <div className="pe-topnav-wrap">
        <TopNav />
      </div>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <div className="pe-bottomnav-wrap">
        <BottomNav />
      </div>
    </div>
  );
}
