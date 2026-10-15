import { useState, useEffect, FormEvent } from 'react';
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle, Globe } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { RegionalState } from '../../types';
import Modal from '../../components/ui/Modal';
import { confirmAction } from '../../utils/confirm';

export default function RegionsPage() {
  const { hasRole } = useAuth();
  const { show } = useToast();
  const canEdit = hasRole('admin');

  const [regionalStates, setRegionalStates] = useState<RegionalState[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RegionalState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formInit = { name: '', code: '', defaultLanguage: '', status: 'active' as 'active' | 'inactive' };
  const [form, setForm] = useState(formInit);

  const fetchData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      const res = await api.get(`/regional-states?${params}`, { signal });
      setRegionalStates(res.data?.items || []);
    } catch (err: any) {
      if (signal?.aborted) return;
      show(err?.response?.data?.message || 'Failed to load data', 'error');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(formInit);
    setShowModal(true);
  };

  const openEdit = (item: RegionalState) => {
    setEditing(item);
    setForm({ name: item.name, code: item.code, defaultLanguage: item.defaultLanguage, status: item.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!form.name.trim() || !form.code.trim() || !form.defaultLanguage.trim()) {
        show('Please fill all fields', 'warning');
        setSubmitting(false); return;
      }
      if (editing) {
        await api.put(`/regional-states/${editing.id}`, form);
        show('Regional state updated', 'success');
      } else {
        await api.post('/regional-states', form);
        show('Regional state created', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirmAction(`Delete "${name}"?`))) return;
    try {
      await api.delete(`/regional-states/${id}`);
      show('Deleted successfully', 'success');
      fetchData();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleToggleStatus = async (item: RegionalState) => {
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      await api.put(`/regional-states/${item.id}`, { status: newStatus });
      show(`${item.name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
      fetchData();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Status change failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search states..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
        </div>
        {canEdit && (
          <button onClick={openCreate} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium">
            <Plus size={18} /> New Regional State
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" /></div>
        ) : regionalStates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Globe size={48} className="mb-3 opacity-30" />
            <p className="text-lg font-medium">No regional states found</p>
            <p className="text-sm">Add a regional state to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 uppercase text-xs tracking-wider">
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Default Language</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-center px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {regionalStates.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{item.code}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300">{item.defaultLanguage}</td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {item.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {item.status}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(item)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Regional State' : 'Create Regional State'} size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Oromia" className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Code <span className="text-red-500">*</span></label>
            <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. OR" maxLength={10} className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono uppercase" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default Language <span className="text-red-500">*</span></label>
            <input type="text" value={form.defaultLanguage} onChange={e => setForm(p => ({ ...p, defaultLanguage: e.target.value }))} placeholder="e.g. Afan Oromo" className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer ${form.status === 'active' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                <input type="radio" name="status" value="active" checked={form.status === 'active'} onChange={() => setForm(p => ({ ...p, status: 'active' }))} className="sr-only" />
                <CheckCircle size={18} /> Active
              </label>
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer ${form.status === 'inactive' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                <input type="radio" name="status" value="inactive" checked={form.status === 'inactive'} onChange={() => setForm(p => ({ ...p, status: 'inactive' }))} className="sr-only" />
                <XCircle size={18} /> Inactive
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium">Cancel</button>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium flex items-center gap-2">
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
