import { useState, useEffect } from 'react';
import { Plus, Calendar, ChevronLeft, ChevronRight, FileText, FileDown, Download, Trash2, ExternalLink, Pencil } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { MediaItem, ReportPdf } from '../../types';
import MediaGallery from '../../components/ui/MediaGallery';
import DatePicker from '../../components/ui/DatePicker';
import { formatMonthRange } from '../../utils/calendar';
import MediaUploadModal from '../../components/ui/MediaUploadModal';
import MediaEditModal from '../../components/ui/MediaEditModal';
import ReportUploadModal from '../../components/ui/ReportUploadModal';
import ReportEditModal from '../../components/ui/ReportEditModal';
import { confirmAction } from '../../utils/confirm';

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function MediaPage() {
  const { hasRole } = useAuth();
  const { show } = useToast();
  const now = new Date();
  const canAddMedia = hasRole('admin', 'radio_assistant');
  const canPostReport = hasRole('admin', 'radio_assistant');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState<'period' | 'month' | 'range'>('period');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [reports, setReports] = useState<ReportPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [showReportUpload, setShowReportUpload] = useState(false);
  const [showReportEdit, setShowReportEdit] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportPdf | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        if (mode === 'period') {
          const res = await api.get(`/media/archive?page=${page}`, { signal: controller.signal });
          setItems(res.data.items || []);
          setReports(res.data.reports || []);
          setTotalPages(typeof res.data.totalPages === 'number' ? res.data.totalPages : null);
          setPeriodStart(res.data.period?.start ? res.data.period.start.slice(0, 10) : '');
          setPeriodEnd(res.data.period?.end ? res.data.period.end.slice(0, 10) : '');
        } else {
          const mediaReq = mode === 'range' && startDate && endDate
            ? api.get(`/media/by-date-range?startDate=${startDate}&endDate=${endDate}T23:59:59`, { signal: controller.signal })
            : api.get(`/media/by-month?year=${year}&month=${month}`, { signal: controller.signal });
          const reportsReq = mode === 'range' && startDate && endDate
            ? api.get(`/reports?startDate=${startDate}&endDate=${endDate}T23:59:59`, { signal: controller.signal })
            : api.get(`/reports?year=${year}&month=${month}`, { signal: controller.signal });
          const [mRes, rRes] = await Promise.all([
            mediaReq,
            reportsReq,
          ]);
          setItems(mRes.data.items || []);
          setReports(rRes.data.items || []);
          setTotalPages(null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        show('Failed to load media and reports', 'error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [mode, page, year, month, startDate, endDate, refresh]);

  const switchMode = (m: 'period' | 'month' | 'range') => {
    setMode(m);
    setPage(1);
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const handleAdded = () => {
    setShowUpload(false);
    setRefresh(r => r + 1);
  };

  const handleEdit = (item: MediaItem) => {
    setEditing(item);
    setShowEdit(true);
  };

  const handleSaved = () => {
    setShowEdit(false);
    setRefresh(r => r + 1);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction('Are you sure you want to delete this media?'))) return;
    try {
      await api.delete(`/media/${id}`);
      show('Media deleted', 'success');
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleReportDownload = async (r: ReportPdf) => {
    try {
      const response = await api.get(`/reports/${r.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = r.originalName || 'report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Download failed', 'error');
    }
  };

  const handleReportEdit = (r: ReportPdf) => {
    setEditingReport(r);
    setShowReportEdit(true);
  };

  const handleReportDelete = async (id: string) => {    if (!(await confirmAction('Are you sure you want to delete this report?'))) return;
    try {
      await api.delete(`/reports/${id}`);
      show('Report deleted', 'success');
      setRefresh(r => r + 1);
    } catch (err: any) {
      show(err?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const photos = items.filter(m => m.type === 'photo');
  const videos = items.filter(m => m.type === 'video' || m.type === 'youtube');
  const headingLabel = mode === 'period'
    ? (formatMonthRange(periodStart, periodEnd) || 'Latest 3 Months')
    : mode === 'month'
      ? `${months[month - 1].label} ${year}`
      : formatMonthRange(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => switchMode('period')} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${mode === 'period' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}><Calendar size={16} /> By Period</button>
            <button onClick={() => switchMode('month')} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${mode === 'month' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>By Month</button>
            <button onClick={() => switchMode('range')} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${mode === 'range' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>Date Range</button>
          </div>
          {mode === 'period' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => (totalPages !== null ? Math.min(totalPages, p + 1) : p + 1))}
                disabled={loading || (totalPages !== null && page >= totalPages)}
                title="Previous 3 months"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <Calendar size={20} className="text-primary-500" />
                <span className="font-medium text-gray-900 dark:text-white">{headingLabel}</span>
                {totalPages !== null && (
                  <span className="text-xs text-gray-400">· Page {page} of {totalPages}</span>
                )}
              </div>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                title="Next 3 months"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ) : mode === 'month' ? (
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronLeft size={20} /></button>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <Calendar size={20} className="text-primary-500" />
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="bg-transparent font-medium text-gray-900 dark:text-white border-none focus:ring-0">
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))}
                  className="bg-transparent font-medium text-gray-900 dark:text-white border-none focus:ring-0">
                  {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map(y =>
                    <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><ChevronRight size={20} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">From</span>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" className="w-44" />
              <span className="text-sm text-gray-500 dark:text-gray-400">To</span>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" className="w-44" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {canAddMedia && (
            <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2">
              <Plus size={20} /> Add Media
            </button>
          )}
          {canPostReport && (
            <button onClick={() => setShowReportUpload(true)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
              <FileDown size={16} /> Post PDF
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">{photos.length} Photos</span>
        <span className="px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium">{videos.length} Videos</span>
        <span className="px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">{reports.length} PDF Reports</span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Testimonial Photos & Videos - {headingLabel}
        </h3>
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" /></div>
        ) : (
          <MediaGallery items={items} onDelete={handleDelete} onEdit={handleEdit} />
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-primary-500" />
            PDF Reports {headingLabel ? `- ${headingLabel}` : ''}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{reports.length} report{reports.length === 1 ? '' : 's'}</span>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileDown size={40} className="mx-auto mb-2 opacity-30" />
            <p>{mode === 'range' ? 'No PDF reports posted for this date range.' : `No PDF reports posted for ${headingLabel}.`}</p>
            {canPostReport && <p className="text-xs mt-1">Use the "Post PDF" button to share a report.</p>}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {reports.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {r.title}
                      {r.sourceType === 'link' && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 align-middle">DRIVE LINK</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {r.sourceType === 'link'
                        ? 'Google Drive link'
                        : <>{r.originalName}{r.fileSize ? ` · ${(r.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}</>}
                      {' · '}
                      {r.reportDate ? new Date(r.reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.sourceType === 'link' ? (
                    <button
                      onClick={() => window.open(r.externalUrl || '', '_blank', 'noopener')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Open Link
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReportDownload(r)}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                  {canPostReport && (
                    <button
                      onClick={() => handleReportEdit(r)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500"
                      title="Edit title / date"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canPostReport && (
                    <button
                      onClick={() => handleReportDelete(r.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MediaUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        defaultDate={`${year}-${String(month).padStart(2, '0')}-01`}
        onSuccess={handleAdded}
      />
      <MediaEditModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        item={editing}
        onSaved={handleSaved}
      />
      <ReportUploadModal
        isOpen={showReportUpload}
        onClose={() => setShowReportUpload(false)}
        onSuccess={() => setRefresh(r => r + 1)}
        defaultYear={year}
        defaultMonth={month}
      />
      <ReportEditModal
        isOpen={showReportEdit}
        onClose={() => setShowReportEdit(false)}
        report={editingReport}
        onSaved={() => setRefresh(r => r + 1)}
      />
    </div>
  );
}
