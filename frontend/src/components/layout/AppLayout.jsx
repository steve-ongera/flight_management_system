/**
 * AppLayout.jsx — Shell with collapsible sidebar + navbar
 */
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV = [
  { section: 'Operations' },
  { to: '/dashboard',   icon: 'bi-speedometer2',    label: 'Dashboard' },
  { to: '/bookings',    icon: 'bi-calendar2-check',  label: 'Bookings',    badge: 'bookings' },
  { to: '/fleet',       icon: 'bi-airplane',          label: 'Fleet' },
  { to: '/crew',        icon: 'bi-people',            label: 'Crew' },
  { to: '/maintenance', icon: 'bi-tools',             label: 'Maintenance' },
  { section: 'Management' },
  { to: '/airports',    icon: 'bi-geo-alt',           label: 'Airports' },
  { to: '/reports',     icon: 'bi-bar-chart-line',    label: 'Reports' },
  { section: 'Admin', adminOnly: true },
  { to: '/users',       icon: 'bi-person-gear',       label: 'Users', adminOnly: true },
  { to: '/settings',    icon: 'bi-sliders',           label: 'Settings' },
];

const PAGE_TITLES = {
  '/dashboard':   'Dashboard',
  '/bookings':    'Bookings',
  '/fleet':       'Fleet',
  '/crew':        'Crew',
  '/maintenance': 'Maintenance',
  '/airports':    'Airports',
  '/reports':     'Reports',
  '/users':       'Users',
  '/settings':    'Settings',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTitle = Object.entries(PAGE_TITLES).find(
    ([path]) => location.pathname.startsWith(path)
  )?.[1] || 'Paramount Charters';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() ||
      user.username[0].toUpperCase()
    : 'U';

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:150 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <i className="bi bi-airplane-fill" />
          </div>
          <div className="sidebar-logo-text">
            <h1>Paramount</h1>
            <span>Charter FMS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, idx) => {
            if (item.section) {
              if (item.adminOnly && user?.role !== 'admin') return null;
              return (
                <div key={idx} className="sidebar-section">{item.section}</div>
              );
            }
            if (item.adminOnly && user?.role !== 'admin') return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-item${isActive ? ' active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <i className={`bi ${item.icon} s-icon`} />
                <span className="s-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-item w-100"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-left s-icon" />
            <span className="s-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Navbar */}
      <header className={`navbar ${collapsed ? 'collapsed' : ''}`}>
        <div className="navbar-left">
          <button
            className="navbar-toggle"
            onClick={() => {
              if (window.innerWidth <= 768) setMobileOpen(!mobileOpen);
              else setCollapsed(!collapsed);
            }}
          >
            <i className={`bi ${collapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-reverse'}`} />
          </button>
          <span className="navbar-breadcrumb">{currentTitle}</span>
        </div>

        <div className="navbar-right">
          <button className="nav-icon-btn">
            <i className="bi bi-bell" />
            <span className="nav-badge" />
          </button>
          <button className="nav-icon-btn" onClick={() => navigate('/settings')}>
            <i className="bi bi-gear" />
          </button>
          <div
            className="nav-avatar"
            title={user?.username}
            onClick={() => navigate('/settings')}
          >
            {initials}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}