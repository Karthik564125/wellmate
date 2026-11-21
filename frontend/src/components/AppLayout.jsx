// Signed-in layout shell: keeps active role synchronized with dashboard URL, renders sidebar, topbar and main routed view.
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext.jsx';
import { NAV_BY_ROLE } from '../routes/navConfig.js';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

// Application layout component: wraps all protected routes in a cohesive desktop/mobile shell.
export function AppLayout() {
  const { role, setRole } = useRole();
  const location = useLocation();

  // Synchronize the global role context when directly navigating to a specific dashboard URL.
  useEffect(() => {
    const match = location.pathname.match(/^\/dashboard\/(admin|caretaker|family|elder|volunteer)/);
    if (match && match[1] && match[1] !== role) {
      setRole(match[1]);
    }
  }, [location.pathname, role, setRole]);

  // Derive navigation links belonging to the active role.
  const links = NAV_BY_ROLE[role] ?? [];

  return (
    <div className="app-shell">
      <Sidebar links={links} />
      <div className="app-main-wrap">
        <Topbar />
        <main id="view" className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
