import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserRole } from './types';
import Layout from './components/layout/Layout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import GroupsPage from './pages/groups/GroupsPage';
import EntryLogPage from './pages/groups/EntryLogPage';
import RegionsPage from './pages/regions/RegionsPage';
import LanguagesPage from './pages/languages/LanguagesPage';
import UsersPage from './pages/users/UsersPage';
import ReportsPage from './pages/reports/ReportsPage';
import MediaPage from './pages/media/MediaPage';
import LoginHistoryPage from './pages/audit/LoginHistoryPage';
import ActivityPage from './pages/audit/ActivityPage';
import BackupPage from './pages/admin/BackupPage';

function RoleRoute({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!roles.some(r => hasRole(r))) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function DashboardRoute({ children }: { children: ReactNode }) {
  const { hasRole } = useAuth();
  if (hasRole('admin', 'radio_assistant', 'viewer')) return <>{children}</>;
  return <Navigate to={hasRole('data_entry') ? '/groups' : '/reports'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardRoute><DashboardPage /></DashboardRoute>} />
                <Route path="/groups" element={<RoleRoute roles={['admin', 'data_entry', 'radio_assistant']}><GroupsPage /></RoleRoute>} />
                <Route path="/entry-log" element={<RoleRoute roles={['admin', 'radio_assistant']}><EntryLogPage /></RoleRoute>} />
                <Route path="/regions" element={<RoleRoute roles={['admin', 'radio_assistant']}><RegionsPage /></RoleRoute>} />
                <Route path="/languages" element={<RoleRoute roles={['admin', 'radio_assistant']}><LanguagesPage /></RoleRoute>} />
                <Route path="/users" element={<RoleRoute roles={['admin']}><UsersPage /></RoleRoute>} />
                <Route path="/login-history" element={<RoleRoute roles={['admin']}><LoginHistoryPage /></RoleRoute>} />
                <Route path="/activity" element={<RoleRoute roles={['admin']}><ActivityPage /></RoleRoute>} />
                <Route path="/backups" element={<RoleRoute roles={['admin']}><BackupPage /></RoleRoute>} />
                <Route path="/reports" element={<RoleRoute roles={['admin', 'radio_assistant']}><ReportsPage /></RoleRoute>} />
                <Route path="/media" element={<RoleRoute roles={['admin', 'viewer', 'radio_assistant']}><MediaPage /></RoleRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
