import { useState, useEffect, useCallback } from 'react';
import { DatabaseBackup, Download, Trash2, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { confirmAction } from '../../utils/confirm';

interface BackupFileInfo {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

interface BackupListResponse {
  items: BackupFileInfo[];
  schedule: string;
  keep: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function BackupPage() {
  const { show } = useToast();
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: BackupListResponse }>('/backups');
      setBackups(data.data.items || []);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to load backups', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const createNow = async () => {
    setCreating(true);
    try {
      await api.post('/backups');
      show('Database backup created', 'success');
      await load();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Backup failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const download = async (b: BackupFileInfo) => {
    try {
      const response = await api.get(`/backups/download/${encodeURIComponent(b.name)}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = b.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Download failed', 'error');
    }
  };

  const remove = async (b: BackupFileInfo) => {
    if (!(await confirmAction(`Delete backup "${b.name}"? This cannot be undone.`))) return;
    try {
      await api.delete(`/backups/${encodeURIComponent(b.name)}`);
      show('Backup deleted', 'success');
      await load();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shrink-0">
              <DatabaseBackup size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Database Backups</h3>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700">
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={createNow}
              disabled={creating}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              {creating ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <DatabaseBackup size={16} />
              )}
              {creating ? 'Creating...' : 'Create Backup Now'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <DatabaseBackup size={40} className="mx-auto mb-2 opacity-30" />
            <p>No backups yet. Click "Create Backup Now" or wait for the nightly schedule.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <th className="text-left px-4 py-3 font-medium">File</th>
                <th className="text-left px-4 py-3 font-medium">Size</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {backups.map(b => (
                <tr key={b.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-mono text-xs break-all">{b.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatSize(b.sizeBytes)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => download(b)}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                      >
                        <Download size={14} /> Download
                      </button>
                      <button
                        onClick={() => remove(b)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete backup"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
