import { useState, useEffect, FormEvent } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { User, RegionalState } from '../../types';
import Modal from '../../components/ui/Modal';
import { confirmAction } from '../../utils/confirm';

export default function UsersPage() {
  const { show } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<RegionalState[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({
    fullName: '', username: '', phone: '', email: '', password: '',
    role: 'viewer' as 'admin' | 'data_entry' | 'viewer' | 'radio_assistant',
    regionalStateId: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    api.get('/regional-states/all').then(({ data }) => setRegions(data.items || data.data || [])).catch(() => {});
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
    const fetch = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        const { data } = await api.get(`/users?${params}`, { signal: controller.signal });
        setUsers(data.items || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        if (controller.signal.aborted) return;
        show('Failed to load users', 'error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetch();
    return () => controller.abort();
  }, [page, search, refresh]);

  const openCreate = () => {
    setEditing(null);
    setForm({ fullName: '', username: '', phone: '', email: '', password: '', role: 'viewer', regionalStateId: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ fullName: u.fullName, username: u.username, phone: u.phone, email: u.email || '', password: '', role: u.role, regionalStateId: u.regionalStateId || '', status: u.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const base = { ...form, regionalStateId: form.role === 'data_entry' ? form.regionalStateId : '' };
      const payload = editing ? { ...base, password: form.password || undefined } : base;
      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
        show('User updated', 'success');
      } else {
        await api.post('/users', payload);
        show('User created', 'success');
      }
      setShowModal(false);
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction('Delete this user?'))) return;
    try { await api.delete(`/users/${id}`); show('User deleted', 'success'); setRefresh(r => r + 1); }
    catch (err: any) { show(err?.response?.data?.message || 'Failed', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search users..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <button onClick={openCreate} className="ml-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2"><Plus size={20} /> New User</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
              <th className="text-left px-4 py-3 font-medium">Full Name</th>
              <th className="text-left px-4 py-3 font-medium">Username</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">{u.phone}</td>
                <td className="px-4 py-3">
                  <span className="capitalize">{u.role.replace('_', ' ')}</span>
                  {u.regionalStateName && <div className="text-xs text-gray-500 dark:text-gray-400">{u.regionalStateName}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3"><div className="flex justify-center gap-2">
                  <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"><Trash2 size={16} /></button>
                </div></td>
              </tr>
            ))}
            {!loading && users.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronLeft size={18} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Create User'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Password {editing && '(leave blank to keep)'}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required={!editing} /></div>
            <div><label className="block text-sm font-medium mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as any, regionalStateId: e.target.value === 'data_entry' ? p.regionalStateId : '' }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="admin">Admin</option>
                <option value="data_entry">Data Entry Clerk</option>
                <option value="radio_assistant">Radio Assistant</option>
                <option value="viewer">Viewer</option>
              </select></div>
          </div>
          {form.role === 'data_entry' && (
            <div><label className="block text-sm font-medium mb-1">Regional State <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(the clerk will only see groups of this state)</span></label>
              <select value={form.regionalStateId} onChange={e => setForm(p => ({ ...p, regionalStateId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
                <option value="">Select regional state...</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></div>
          )}
          <div><label className="block text-sm font-medium mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
