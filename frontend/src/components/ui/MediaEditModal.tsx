import { useState, FormEvent, useEffect } from 'react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { MediaItem } from '../../types';

interface MediaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem | null;
  onSaved: () => void;
}

export default function MediaEditModal({ isOpen, onClose, item, onSaved }: MediaEditModalProps) {
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dateTaken: '' });

  useEffect(() => {
    if (isOpen && item) {
      setForm({
        title: item.title || '',
        description: item.description || '',
        dateTaken: item.dateTaken?.split('T')[0] || '',
      });
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    try {
      await api.put(`/media/${item.id}`, {
        title: form.title,
        description: form.description,
        dateTaken: form.dateTaken,
      });
      show('Media updated successfully', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Media" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Enter title..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Enter description..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <DatePicker value={form.dateTaken} onChange={(v) => setForm(p => ({ ...p, dateTaken: v }))} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
