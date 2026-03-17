// frontend/src/components/AppShell.jsx
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import TopNav from './TopNav';

export default function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar />

      {/* Desktop top nav — hidden on mobile via CSS */}
      <div className="pe-topnav-wrap">
        <TopNav />
      </div>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <div className="pe-bottomnav-wrap">
        <BottomNav />
      </div>
    </div>
  );
}
