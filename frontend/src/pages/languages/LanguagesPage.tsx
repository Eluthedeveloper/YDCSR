import { useState, useEffect, FormEvent } from 'react';
import { Plus, Globe, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Language } from '../../types';
import Modal from '../../components/ui/Modal';
import { confirmAction } from '../../utils/confirm';

export default function LanguagesPage() {
  const { show } = useToast();
  const { hasRole } = useAuth();
  const canManage = hasRole('admin');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Language | null>(null);
  const [name, setName] = useState('');

  const fetch = async () => {
    try {
      const { data } = await api.get('/languages');
      setLanguages(data.items || []);
    } catch (err) {
      show('Failed to load languages', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setShowModal(true);
  };

  const openEdit = (lang: Language) => {
    setEditing(lang);
    setName(lang.name);
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/languages/${editing.id}`, { name });
        show('Language updated', 'success');
      } else {
        await api.post('/languages', { name });
        show('Language added', 'success');
      }
      setName('');
      setEditing(null);
      setShowModal(false);
      fetch();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (lang: Language) => {
    if (!(await confirmAction(`Delete "${lang.name}"?`))) return;
    try {
      await api.delete(`/languages/${lang.id}`);
      show('Language deleted', 'success');
      fetch();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Failed to delete language', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-gray-500 dark:text-gray-400 text-sm flex-1 min-w-[10rem]">{languages.length} languages configured</p>
        {canManage && (
          <button onClick={openCreate} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2"><Plus size={20} /> Add Language</button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {languages.map(l => (
          <div key={l.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg shrink-0">
              <Globe size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <span className="font-medium text-gray-900 dark:text-white flex-1 truncate">{l.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {canManage && (
                <>
                  <button onClick={() => openEdit(l)} title="Edit language"
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors dark:text-gray-400">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(l)} title="Delete language"
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors dark:text-gray-400">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!loading && languages.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">No languages added yet</div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Language' : 'Add Language'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
