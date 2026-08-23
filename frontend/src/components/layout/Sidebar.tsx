import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, MapPin, Globe, Radio,
  FileText, ChevronLeft, Menu, Image as ImageIcon, LogIn, Activity, DatabaseBackup, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import Logo from '../ui/Logo';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'radio_assistant', 'viewer'] },
  { to: '/groups', icon: Radio, label: 'Radio Home Groups', roles: ['admin', 'data_entry', 'radio_assistant'] },
  { to: '/entry-log', icon: ClipboardList, label: 'Entry Log', roles: ['admin', 'radio_assistant'] },
  { to: '/regions', icon: MapPin, label: 'Regional States', roles: ['admin', 'radio_assistant'] },
  { to: '/languages', icon: Globe, label: 'Languages', roles: ['admin', 'radio_assistant'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
  { to: '/login-history', icon: LogIn, label: 'Login History', roles: ['admin'] },
  { to: '/activity', icon: Activity, label: 'All Activity', roles: ['admin'] },
  { to: '/backups', icon: DatabaseBackup, label: 'Database Backups', roles: ['admin'] },
  { to: '/media', icon: ImageIcon, label: 'Media & Reports', roles: ['admin', 'viewer', 'radio_assistant'] },
  { to: '/reports', icon: FileText, label: 'Monthly Report', roles: ['admin', 'radio_assistant'] },
];

export default function Sidebar() {
  const { user, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter((item) =>
    item.roles.some((r) => hasRole(r as any))
  );

  const labelFor = (item: (typeof navItems)[number]) => {
    if (item.to === '/media' && hasRole('viewer') && !hasRole('admin')) return 'Testimonies and Reports';
    return item.label;
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo size={38} />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-primary-600 dark:text-primary-400 leading-tight truncate">Yemisrach Dimts</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">Communication Service</p>
            </div>
          </div>
        ) : (
          <Logo size={32} className="mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`
            }
          >
            <item.icon size={20} />
            {!collapsed && <span>{labelFor(item)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
