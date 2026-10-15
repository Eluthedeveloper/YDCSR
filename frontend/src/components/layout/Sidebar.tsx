import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, MapPin, Globe, Radio,
  FileText, ChevronLeft, Menu, Image as ImageIcon, LogIn, Activity, DatabaseBackup, ClipboardList, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Fragment, useState } from 'react';
import Logo from '../ui/Logo';

// Ordered by standard admin-panel convention:
// 1. Overview -> 2. Core workflows -> 3. Master/reference data -> 4. Administration
const navItems = [
  { section: 'Main', to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'radio_assistant', 'viewer'] },
  { section: 'Main', to: '/groups', icon: Radio, label: 'Radio Home Groups', roles: ['admin', 'data_entry', 'radio_assistant'] },
  { section: 'Main', to: '/media', icon: ImageIcon, label: 'Media & Reports', roles: ['admin', 'viewer', 'radio_assistant'] },
  { section: 'Main', to: '/reports', icon: FileText, label: 'Monthly Report', roles: ['admin', 'radio_assistant'] },
  { section: 'Main', to: '/entry-log', icon: ClipboardList, label: 'Entry Log', roles: ['admin', 'radio_assistant'] },

  { section: 'Master Data', to: '/regions', icon: MapPin, label: 'Regional States', roles: ['admin', 'radio_assistant'] },
  { section: 'Master Data', to: '/languages', icon: Globe, label: 'Languages', roles: ['admin', 'radio_assistant'] },

  { section: 'Administration', to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
  { section: 'Administration', to: '/login-history', icon: LogIn, label: 'Login History', roles: ['admin'] },
  { section: 'Administration', to: '/activity', icon: Activity, label: 'All Activity', roles: ['admin'] },
  { section: 'Administration', to: '/backups', icon: DatabaseBackup, label: 'Database Backups', roles: ['admin'] },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onNavigate,
  showClose,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  showClose?: boolean;
}) {
  const { user, hasRole } = useAuth();

  const filteredItems = navItems.filter((item) =>
    item.roles.some((r) => hasRole(r as any))
  );

  const labelFor = (item: (typeof navItems)[number]) => {
    if (item.to === '/media' && hasRole('viewer') && !hasRole('admin')) return 'Testimonies and Reports';
    return item.label;
  };

  return (
    <>
      <div
        className={`flex items-center border-b border-gray-200 dark:border-gray-700 ${
          collapsed ? 'flex-col gap-2 px-2 py-3' : 'justify-between p-4'
        }`}
      >
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
          onClick={showClose ? onNavigate : onToggleCollapse}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 lg:hidden"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:block p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item, index) => {
          const newSection = index > 0 && item.section !== filteredItems[index - 1].section;
          return (
            <Fragment key={item.to}>
              {newSection &&
                (collapsed ? (
                  <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                ) : (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {item.section}
                  </p>
                ))}
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-2' : 'px-3'
                  } py-2.5 ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`
                }
              >
                <item.icon size={20} />
                {!collapsed && <span>{labelFor(item)}</span>}
              </NavLink>
            </Fragment>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } hidden lg:flex flex-col shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300`}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent
            collapsed={false}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            onNavigate={onCloseMobile}
            showClose
          />
        </aside>
      </div>
    </>
  );
}
