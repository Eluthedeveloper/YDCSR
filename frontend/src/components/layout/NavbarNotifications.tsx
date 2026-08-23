import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, LogIn, Activity } from 'lucide-react';
import {
  fetchRecentActivity, describe, timeAgo, entityMeta,
  ActivityItem,
} from '../../utils/activity';
import { useAuth } from '../../contexts/AuthContext';

export default function NavbarNotifications() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [hasUnseen, setHasUnseen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchRecentActivity(10);
      setItems(list);
      setHasUnseen(list.length > 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setHasUnseen(false);
      load();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        title="Notifications"
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 relative"
      >
        <Bell size={20} />
        {hasUnseen && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Recent Activity</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item) => {
                  const meta = entityMeta[item.entity] || { color: 'text-gray-500 bg-gray-100 dark:bg-gray-900/30' };
                  const Icon = item.action === 'LOGIN' ? LogIn : (meta as any).icon || Activity;
                  return (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <span className={`p-2 rounded-lg shrink-0 ${meta.color}`}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white leading-snug">{describe(item)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(item.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasRole('admin') && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
              <button
                onClick={() => { setOpen(false); navigate('/activity'); }}
                className="w-full px-3 py-2 text-center text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
              >
                View all activity
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
