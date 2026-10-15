import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, LogIn, Monitor, Trash2, Trash, Info } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { AuditLog } from '../../types';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { confirmAction } from '../../utils/confirm';

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
}

export default function LoginHistoryPage() {
  const { show } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refresh, setRefresh] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => setPaused(!!data?.data?.loginLoggingPaused))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLogins = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        const { data } = await api.get(`/audit-logs/logins?${params}`, { signal: controller.signal });
        setLogs(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        show('Failed to load login history', 'error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchLogins();
    return () => controller.abort();
  }, [page, search, refresh]);

  useEffect(() => {
    setSelected(new Set());
  }, [page, search, refresh]);

  const allSelected = logs.length > 0 && logs.every(l => selected.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      logs.forEach(l => next.delete(l.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      logs.forEach(l => next.add(l.id));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const deleteOne = async (id: string) => {
    const ok = await confirmAction('This login history record will be permanently deleted.');
    if (!ok) return;
    try {
      await api.delete(`/audit-logs/${id}`);
      show('Login history record deleted', 'success');
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to delete record', 'error');
    }
  };

  const deleteSelected = async () => {
    const count = selected.size;
    const ok = await confirmAction(`${count} login history record(s) will be permanently deleted.`);
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete('/audit-logs', { data: { ids: [...selected] } });
      show(`${count} login history record(s) deleted`, 'success');
      setSelected(new Set());
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to delete records', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleLogging = async () => {
    try {
      const next = !paused;
      await api.put('/settings', { loginLoggingPaused: next });
      setPaused(next);
      show(next ? 'Login logging paused - new sign-ins will not be recorded' : 'Login logging resumed', 'success');
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to update login logging', 'error');
    }
  };

  const clearAll = async () => {
    const ok = await confirmAction('This will permanently delete ALL login history records.');
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete('/audit-logs/all');
      show('All login history deleted', 'success');
      setSelected(new Set());
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to delete login history', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search by user name..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
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
            onClick={clearAll}
            disabled={deleting}
            className="px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
          >
            <Trash size={16} /> Clear All
          </button>
          <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-600 dark:text-gray-300">Login logging</span>
            <button
              onClick={toggleLogging}
              role="switch"
              aria-checked={paused}
              title={paused ? 'Resume login logging' : 'Pause login logging'}
              className={`relative w-10 h-5 rounded-full transition-colors ${paused ? 'bg-amber-500' : 'bg-green-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${paused ? 'translate-x-5' : ''}`} />
            </button>
            <span className={`font-medium ${paused ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
              {paused ? 'Paused' : 'Active'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ml-2">
            <LogIn size={16} />
            <span>Total logins: <span className="font-semibold text-gray-900 dark:text-white">{total}</span></span>
          </div>
        </div>
      </div>

      {paused && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
          <Info size={16} className="shrink-0" />
          Login logging is paused - new sign-ins are not being recorded.
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <div className="overflow-x-auto">
          <table className="responsive-table w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-primary-600"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-left px-4 py-3 font-medium">IP Address</th>
                <th className="text-left px-4 py-3 font-medium">Device</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="md:divide-y md:divide-gray-100 dark:md:divide-gray-700">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td data-label="Select" className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(log.id)}
                      onChange={() => toggleOne(log.id)}
                      className="w-4 h-4 accent-primary-600"
                    />
                  </td>
                  <td data-label="Date & Time" className="px-4 py-3 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td data-label="User" className="px-4 py-3">
                    <div className="text-right md:text-left md:contents">
                      <p className="font-medium">{log.userName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{log.username}</p>
                    </div>
                  </td>
                  <td data-label="Location" className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 flex-wrap justify-end md:justify-start">
                      {flagEmoji(log.countryCode) && <span className="text-base leading-none">{flagEmoji(log.countryCode)}</span>}
                      <span className="font-medium">{log.country || 'Unknown'}</span>
                      {log.city && <span className="text-xs text-gray-500 dark:text-gray-400">({log.city})</span>}
                    </span>
                  </td>
                  <td data-label="IP Address" className="px-4 py-3 font-mono break-all">{log.ipAddress || '-'}</td>
                  <td data-label="Device" className="px-4 py-3 min-w-0">
                    {log.userAgent ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">
                        <Monitor size={14} className="shrink-0" />
                        <span className="truncate">{log.userAgent.length > 60 ? `${log.userAgent.slice(0, 60)}...` : log.userAgent}</span>
                      </span>
                    ) : '-'}
                  </td>
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
              {logs.length === 0 && <tr><td colSpan={7} className="no-label px-4 py-12 text-center text-gray-500 dark:text-gray-400">No logins found</td></tr>}
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
