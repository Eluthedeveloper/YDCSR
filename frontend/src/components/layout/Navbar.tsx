import { Moon, Sun, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import NavbarNotifications from './NavbarNotifications';
import Logo from '../ui/Logo';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/groups': 'Radio Home Groups',
  '/regions': 'Regional States',
  '/languages': 'Languages',
  '/users': 'Users',
  '/login-history': 'Login History',
  '/activity': 'All Activity',
  '/backups': 'Database Backups',
  '/media': 'Media & Reports',
  '/reports': 'Monthly Report',
};

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { dark, toggle } = useTheme();
  const { logout, hasRole } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'YDCS';

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="hidden sm:block shrink-0">
          <Logo size={40} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
            YEMISRACH DIMTS COMMUNICATION SERVICE
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 truncate">
            Radio Home Management System &middot; {title}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {hasRole('admin') && <NavbarNotifications />}
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          title="Toggle theme"
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={() => { logout(); toast.success('Signed out'); }}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
