// frontend/src/components/AppShell.jsx
import { Outlet, useMatch } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import TopNav from './TopNav';

function useSubPage() {
  const registerMatch = useMatch('/tournament/:id/register');
  const tournamentMatch = useMatch('/tournament/:id');
  if (registerMatch) return { isSubPage: true, title: 'Anmelden' };
  if (tournamentMatch) return { isSubPage: true, title: 'Turnier-Detail' };
  return { isSubPage: false, title: '' };
}

export default function AppShell() {
  const { isSubPage, title } = useSubPage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar isSubPage={isSubPage} title={title} />

      {/* Desktop top nav — hidden on mobile, hidden on sub-pages */}
      {!isSubPage && (
        <div className="desktop-nav-only">
          <TopNav />
        </div>
      )}

      <main className="pe-page-enter" style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — hidden on desktop, hidden on sub-pages */}
      {!isSubPage && (
        <div className="mobile-nav-only">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
