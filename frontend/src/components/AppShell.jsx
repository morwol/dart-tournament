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

      {/* Desktop top nav — only on root pages, hidden on mobile via CSS */}
      {!isSubPage && (
        <div className="pe-topnav-wrap">
          <TopNav />
        </div>
      )}

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav — only on root pages, hidden on desktop via CSS */}
      {!isSubPage && (
        <div className="pe-bottomnav-wrap">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
