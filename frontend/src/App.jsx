/**
 * App.jsx — Root router with role-based protected routes
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

// Layout
import AppLayout from './components/layout/AppLayout.jsx';

// Pages
import LoginPage       from './pages/LoginPage.jsx';
import DashboardPage   from './pages/DashboardPage.jsx';
import BookingsPage    from './pages/BookingsPage.jsx';
import BookingDetail   from './pages/BookingDetail.jsx';
import FleetPage       from './pages/FleetPage.jsx';
import AircraftDetail  from './pages/AircraftDetail.jsx';
import CrewPage        from './pages/CrewPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import AirportsPage    from './pages/AirportsPage.jsx';
import ReportsPage     from './pages/ReportsPage.jsx';
import UsersPage       from './pages/UsersPage.jsx';
import SettingsPage    from './pages/SettingsPage.jsx';
import ClientPortal    from './pages/ClientPortal.jsx';
import PilotPortal     from './pages/PilotPortal.jsx';
import NotFound        from './pages/NotFound.jsx';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === 'client') return <Navigate to="/client" replace />;
  if (user?.role === 'pilot')  return <Navigate to="/pilot"  replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <LoginPage />
        } />

        {/* Role redirect */}
        <Route path="/" element={
          <ProtectedRoute><RoleHome /></ProtectedRoute>
        } />

        {/* Admin / Ops routes */}
        <Route element={
          <ProtectedRoute allowedRoles={['admin', 'ops']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/bookings"    element={<BookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/fleet"       element={<FleetPage />} />
          <Route path="/fleet/:id"   element={<AircraftDetail />} />
          <Route path="/crew"        element={<CrewPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/airports"    element={<AirportsPage />} />
          <Route path="/reports"     element={<ReportsPage />} />
          <Route path="/settings"    element={<SettingsPage />} />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Client portal */}
        <Route path="/client" element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientPortal />
          </ProtectedRoute>
        } />

        {/* Pilot portal */}
        <Route path="/pilot" element={
          <ProtectedRoute allowedRoles={['pilot']}>
            <PilotPortal />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}