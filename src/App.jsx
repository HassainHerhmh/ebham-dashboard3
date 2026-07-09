import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getStoredUser, clearPlatformUser } from './api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserPermissions from './pages/UserPermissions';
import Captains from './pages/Captains';
import Shifts from './pages/Shifts';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Attendance from './pages/Attendance';
import Finance from './pages/Finance';
import Orders from './pages/Orders';
import ReportsAttendance from './pages/ReportsAttendance';
import ReportsSales from './pages/ReportsSales';
import ReportsCommissions from './pages/ReportsCommissions';
import ReportsRent from './pages/ReportsRent';
import ReportsStores from './pages/ReportsStores';
import ReportsAccountStatement from './pages/ReportsAccountStatement';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './routes/ProtectedRoute';
import { NotificationsProvider } from './context/NotificationsContext';
import { getFirstAccessiblePath, hasPermission, normalizePermissions } from './utils/permissions';
import useIdleLogout, { isSessionExpired, touchActivity, clearActivity } from './hooks/useIdleLogout';

function HomeRoute({ user }) {
  if (hasPermission(user, 'dashboard', 'view')) {
    return (
      <ProtectedRoute user={user} section="dashboard">
        <Dashboard />
      </ProtectedRoute>
    );
  }
  return <Navigate to={getFirstAccessiblePath(user)} replace />;
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = getStoredUser();
    if (!stored || isSessionExpired()) {
      if (stored) clearPlatformUser();
      clearActivity();
      return null;
    }
    return { ...stored, permissions: normalizePermissions(stored.permissions) };
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = useCallback(() => {
    clearPlatformUser();
    clearActivity();
    setUser(null);
  }, []);

  useIdleLogout(handleLogout);

  const handleLogin = (nextUser) => {
    touchActivity();
    setUser(nextUser);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <NotificationsProvider>
      <BrowserRouter>
      <div
        className="app-shell min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300"
        dir="rtl"
      >
        <div className="flex min-h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Header user={user} onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />
            <main className="app-main flex-1 overflow-y-auto p-4 md:p-6">
              <Routes>
                <Route path="/" element={<HomeRoute user={user} />} />
                <Route path="/users" element={<ProtectedRoute user={user} section="users"><Users /></ProtectedRoute>} />
                <Route path="/users/permissions" element={<ProtectedRoute user={user} section="user_permissions"><UserPermissions onUserChange={setUser} /></ProtectedRoute>} />
                <Route path="/captains" element={<ProtectedRoute user={user} section="captains"><Captains /></ProtectedRoute>} />
                <Route path="/shifts" element={<ProtectedRoute user={user} section="shifts"><Shifts /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute user={user} section="messages"><Messages /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute user={user} section="chat"><Chat user={user} /></ProtectedRoute>} />
                <Route path="/attendance" element={<ProtectedRoute user={user} section="reports_attendance"><Attendance /></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute user={user} section="finance"><Finance /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute user={user} section="orders"><Orders user={user} /></ProtectedRoute>} />
                <Route path="/reports/attendance" element={<ProtectedRoute user={user} section="reports_attendance"><ReportsAttendance /></ProtectedRoute>} />
                <Route path="/reports/sales" element={<ProtectedRoute user={user} section="reports_sales"><ReportsSales /></ProtectedRoute>} />
                <Route path="/reports/commissions" element={<ProtectedRoute user={user} section="reports_commissions"><ReportsCommissions /></ProtectedRoute>} />
                <Route path="/reports/rent" element={<ProtectedRoute user={user} section="reports_rent"><ReportsRent /></ProtectedRoute>} />
                <Route path="/reports/stores" element={<ProtectedRoute user={user} section="reports_stores"><ReportsStores /></ProtectedRoute>} />
                <Route path="/reports/account-statement" element={<ProtectedRoute user={user} section="reports_account_statement"><ReportsAccountStatement /></ProtectedRoute>} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="*" element={<Navigate to={getFirstAccessiblePath(user)} replace />} />
              </Routes>
            </main>
          </div>
        </div>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة"
          />
        )}
      </div>
    </BrowserRouter>
    </NotificationsProvider>
  );
}
