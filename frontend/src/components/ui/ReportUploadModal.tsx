import { useState, useEffect, FormEvent } from 'react';
import { Upload, FileText, Link as LinkIcon } from 'lucide-react';
import Modal from './Modal';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultYear?: number;
  defaultMonth?: number;
}

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function ReportUploadModal({ isOpen, onClose, onSuccess, defaultYear, defaultMonth }: ReportUploadModalProps) {
  const { show } = useToast();
  const now = new Date();
  const [tab, setTab] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [year, setYear] = useState(defaultYear ?? now.getFullYear());
  const [month, setMonth] = useState(defaultMonth ?? now.getMonth() + 1);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setYear(defaultYear ?? now.getFullYear());
      setMonth(defaultMonth ?? now.getMonth() + 1);
      setTitle('');
      setFile(null);
      setLinkUrl('');
      setTab('file');
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      show('Please select a PDF file', 'error');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(f);
    e.target.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (tab === 'file') {
      if (!file) {
        show('Please select a PDF file', 'error');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('year', String(year));
        formData.append('month', String(month));
        await api.post('/reports/upload', formData);
        show('Report posted successfully', 'success');
        onSuccess();
        onClose();
        setTitle('');
        setFile(null);
      } catch (err: any) {
        show(err?.response?.data?.message || 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
    } else {
      if (!linkUrl.trim()) {
        show('Please paste the report link', 'error');
        return;
      }
      try {
        const parsed = new URL(linkUrl.trim());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
      } catch {
        show('Please enter a valid link starting with http:// or https://', 'error');
        return;
      }

      setUploading(true);
      try {
        await api.post('/reports/link', {
          title,
          url: linkUrl.trim(),
          year,
          month,
        });
        show('Report link posted successfully', 'success');
        onSuccess();
        onClose();
        setTitle('');
        setLinkUrl('');
      } catch (err: any) {
        show(err?.response?.data?.message || 'Failed to post report link', 'error');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post PDF Report" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'file'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Upload size={16} /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === 'link'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <LinkIcon size={16} /> Google Drive Link
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. August 2026 Monthly Report"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Month</label>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map(y =>
                <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {tab === 'file' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PDF File</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 bg-gray-50 dark:bg-gray-700/50">
              {file ? (
                <div className="flex flex-col items-center justify-center text-center px-4">
                  <FileText size={28} className="text-primary-500 mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 break-all">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Click to select PDF file</p>
                </div>
              )}
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Drive Link</label>
            <div className="relative">
              <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              In Google Drive, right-click the PDF → Share → "Anyone with the link", then paste the link here.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button
            type="submit"
            disabled={uploading || (tab === 'file' ? !file : !linkUrl.trim())}
            className={`px-4 py-2 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${tab === 'file' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {uploading ? 'Posting...' : tab === 'file'
              ? <><Upload size={16} /> Post Report</>
              : <><LinkIcon size={16} /> Post Report Link</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
