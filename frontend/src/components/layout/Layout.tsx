import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const { isAuthenticated, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
        <footer className="shrink-0 px-6 pt-6 pb-5 border-t border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center gap-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary-400/60 dark:to-primary-500/50" />
              <span className="tracking-wide text-gray-500 dark:text-gray-400">Developed by</span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary-400/60 dark:to-primary-500/50" />
            </div>
            <a
              href="https://yemisrachdimts.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-400 dark:to-primary-300 bg-clip-text text-transparent hover:from-primary-700 hover:to-primary-600 dark:hover:from-primary-300 dark:hover:to-primary-200 transition-all duration-300"
            >
              Eliyas Daba
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
