import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Trash2, Trash, Activity } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { AuditLog } from '../../types';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { confirmAction } from '../../utils/confirm';

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_FILTERS = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'DELETE_ALL', 'IMPORT', 'LOGIN'];

const actionBadge = (action: string) => {
  switch (action) {
    case 'CREATE': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'UPDATE': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    case 'IMPORT': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
    case 'LOGIN': return 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300';
    case 'DELETE':
    case 'DELETE_ALL': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  }
};

export default function ActivityPage() {
  const { show } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refresh, setRefresh] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (actionFilter !== 'ALL') params.set('action', actionFilter);
        const { data } = await api.get(`/audit-logs?${params}`, { signal: controller.signal });
        setLogs(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        show('Failed to load activity', 'error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchLogs();
    return () => controller.abort();
  }, [page, search, actionFilter, refresh]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, search, actionFilter, refresh]);

  const allSelected = logs.length > 0 && logs.every(l => selected.has(l.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) logs.forEach(l => next.delete(l.id));
    else logs.forEach(l => next.add(l.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const deleteOne = async (id: string) => {
    const ok = await confirmAction('This activity record will be permanently deleted.');
    if (!ok) return;
    try {
      await api.delete(`/audit-logs/${id}`);
      show('Activity record deleted', 'success');
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to delete record', 'error');
    }
  };

  const deleteSelected = async () => {
    const count = selected.size;
    const ok = await confirmAction(`${count} activity record(s) will be permanently deleted.`);
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete('/audit-logs', { data: { ids: [...selected] } });
      show(`${count} activity record(s) deleted`, 'success');
      setSelected(new Set());
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to delete records', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteAll = async () => {
    const ok = await confirmAction('This will permanently delete ALL activity records (logins, creates, updates, deletes). This cannot be undone.');
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete('/audit-logs/activity/all');
      show('All activity deleted', 'success');
      setSelected(new Set());
      setPage(1);
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to delete activity', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by user, action..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          >
            {ACTION_FILTERS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All actions' : a.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={deleteSelected}
            disabled={selected.size === 0 || deleting}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center gap-2"
          >
            <Trash2 size={16} /> Delete Selected ({selected.size})
          </button>
          <button
            onClick={deleteAll}
            disabled={deleting}
            className="px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
          >
            <Trash size={16} /> Delete All Activity
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ml-2">
            <Activity size={16} />
            <span>Total: <span className="font-semibold text-gray-900 dark:text-white">{total}</span></span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <div className="overflow-x-auto">
          <table className="responsive-table w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-primary-600" />
                </th>
                <th className="text-left px-4 py-3 font-medium">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">On</th>
                <th className="text-left px-4 py-3 font-medium">IP Address</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="md:divide-y md:divide-gray-100 dark:md:divide-gray-700">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td data-label="Select" className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleOne(log.id)} className="w-4 h-4 accent-primary-600" />
                  </td>
                  <td data-label="Date & Time" className="px-4 py-3 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td data-label="User" className="px-4 py-3">
                    <div className="text-right md:text-left md:contents">
                      <p className="font-medium">{log.userName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{log.username}</p>
                    </div>
                  </td>
                  <td data-label="Action" className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${actionBadge(log.action)}`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td data-label="On" className="px-4 py-3">{log.entity}</td>
                  <td data-label="IP Address" className="px-4 py-3 font-mono break-all">{log.ipAddress || '-'}</td>
                  <td data-label="Actions" className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteOne(log.id)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Delete record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={7} className="no-label px-4 py-12 text-center text-gray-500 dark:text-gray-400">No activity found</td></tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronLeft size={18} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
