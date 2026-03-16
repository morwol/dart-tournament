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
  // /referee: TopBar only, no nav row (board picker context)
  const isRefereeEntry = useMatch('/referee');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar isSubPage={isSubPage} title={title} />

      {/* Desktop top nav — hidden on mobile, hidden at /referee and on sub-pages */}
      {!isSubPage && !isRefereeEntry && (
        <div className="desktop-nav-only">
          <TopNav />
        </div>
      )}

      <main className="pe-page-enter" style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — hidden on desktop, hidden at /referee and on sub-pages */}
      {!isSubPage && !isRefereeEntry && (
        <div className="mobile-nav-only">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
