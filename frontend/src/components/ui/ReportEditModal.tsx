import { useState, FormEvent, useEffect } from 'react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { ReportPdf } from '../../types';

interface ReportEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportPdf | null;
  onSaved: () => void;
}

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportEditModal({ isOpen, onClose, report, onSaved }: ReportEditModalProps) {
  const { show } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', reportDate: '' });

  useEffect(() => {
    if (isOpen && report) {
      const d = report.reportDate ? new Date(report.reportDate) : null;
      setForm({
        title: report.title || '',
        reportDate: d && !isNaN(d.getTime()) ? toLocalDateString(d) : '',
      });
    }
  }, [isOpen, report]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!report) return;
    if (!form.title.trim()) {
      show('Please enter a title', 'error');
      return;
    }
    if (!form.reportDate) {
      show('Please choose a date', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/reports/${report.id}`, {
        title: form.title.trim(),
        reportDate: form.reportDate,
      });
      show('Report updated successfully', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit PDF Report" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. August 2026 Monthly Report"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Date</label>
          <DatePicker value={form.reportDate} onChange={(v) => setForm(p => ({ ...p, reportDate: v }))} />
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
