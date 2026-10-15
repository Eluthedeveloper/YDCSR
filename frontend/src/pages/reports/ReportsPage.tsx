import { useState, useEffect } from 'react';
import { Download, Printer, Calendar, Image, Youtube, Video, Users, Radio, Handshake, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { RadioHomeGroup, MediaItem } from '../../types';
import { getYoutubeThumbnail } from '../../components/ui/MediaGallery';
import DatePicker from '../../components/ui/DatePicker';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const escHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const csvCell = (value: unknown): string => {
  const s = String(value ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function ReportsPage() {
  const { show } = useToast();
  const { hasRole } = useAuth();
  const canViewGroups = hasRole('admin', 'data_entry', 'radio_assistant');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mode, setMode] = useState<'month' | 'range'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groups, setGroups] = useState<RadioHomeGroup[]>([]);
  const [allGroups, setAllGroups] = useState<RadioHomeGroup[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const GROUPS_PER_PAGE = 15;
  const [groupPage, setGroupPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    const fetch = async () => {
      setLoading(true);
      try {
        const rangeActive = mode === 'range' && startDate && endDate;
        const gRes = rangeActive
          ? api.get(`/groups?from=${startDate}&to=${endDate}&limit=1000`, { signal: controller.signal })
          : api.get(`/groups?year=${year}&month=${month}&limit=1000`, { signal: controller.signal });
        const mRes = rangeActive
          ? api.get(`/media/by-date-range?startDate=${startDate}&endDate=${endDate}T23:59:59`, { signal: controller.signal })
          : api.get(`/media/by-month?year=${year}&month=${month}`, { signal: controller.signal });
        const allRes = canViewGroups ? api.get('/groups/all', { signal: controller.signal }) : null;
        const [gResult, mResult, allResult] = await Promise.all([
          gRes,
          mRes,
          allRes,
        ]);
        setGroups(gResult.data.items || []);
        setMediaItems(mResult.data.items || []);
        setAllGroups(allResult?.data.items || []);
        setGroupPage(1);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetch();
    return () => controller.abort();
  }, [year, month, mode, startDate, endDate, refresh, canViewGroups]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const totals = groups.reduce((acc, g) => ({
    male: acc.male + g.maleMembers,
    female: acc.female + g.femaleMembers,
    total: acc.total + g.totalMembers,
    radios: acc.radios + g.radioGiven,
    agreements: acc.agreements + g.agreementMade,
  }), { male: 0, female: 0, total: 0, radios: 0, agreements: 0 });

  const genderData = [
    { name: 'Male', value: totals.male },
    { name: 'Female', value: totals.female },
  ];

  const photos = mediaItems.filter(m => m.type === 'photo');
  const allVideos = mediaItems.filter(m => m.type === 'youtube' || m.type === 'video');
  const allMediaItems = mediaItems;

  const groupTotalPages = Math.max(1, Math.ceil(groups.length / GROUPS_PER_PAGE));
  const pagedGroups = groups.slice((groupPage - 1) * GROUPS_PER_PAGE, groupPage * GROUPS_PER_PAGE);

  const exportCSV = () => {
    if (!canViewGroups) {
      show('You do not have permission to export groups', 'error');
      return;
    }
    if (allGroups.length === 0) {
      show('No groups available to export', 'warning');
      return;
    }
    const headers = ['Serial Number', 'Date Started', 'Regional State', 'Region', 'Language', 'Church Name', 'Group Leader name', 'Leader Phone', 'Facilitator Name', 'Facilitator Phone', 'Male', 'Female', 'Total Members', 'Radios Given', 'Agreements Made', 'Remark', 'Status'];
    const rows = allGroups.map(g => [
      g.serialNumber, g.dateStarted?.split('T')[0] || '', g.regionalStateName, g.regionName, g.languageName, g.churchName,
      g.groupLeaderName, g.groupLeaderPhone, g.facilitatorName, g.facilitatorPhone,
      g.maleMembers, g.femaleMembers, g.totalMembers, g.radioGiven ? 'Yes' : 'No', g.agreementMade ? 'Yes' : 'No',
      g.remark || '', g.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${csvCell(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ydcs-all-groups-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPpt = async () => {
    try {
      const response = await api.get(`/reports/ppt?year=${year}&month=${month}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ydcs-report-${year}-${String(month).padStart(2, '0')}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      show(err?.response?.data?.message || 'PPT download failed', 'error');
    }
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const groupsHtml = canViewGroups
      ? groups.map(g => `<tr><td>${escHtml(g.serialNumber)}</td><td>${escHtml(g.regionName)}</td><td>${escHtml(g.churchName)}</td><td>${escHtml(g.groupLeaderName)}</td><td>${escHtml(g.totalMembers)}</td><td>${escHtml(g.radioGiven)}</td><td>${escHtml(g.agreementMade)}</td><td>${escHtml(g.status)}</td></tr>`).join('')
      : '';
    const groupsSectionHtml = canViewGroups
      ? `<h2>Groups</h2><table><tr><th>Serial</th><th>Region</th><th>Church</th><th>Leader</th><th>Members</th><th>Radios</th><th>Agreements</th><th>Status</th></tr>${groupsHtml}</table>`
      : '';

    const mediaHtml = mediaItems.map(m => {
      if (m.type === 'photo') return `<div style="margin:10px 0;border:1px solid #ddd;padding:10px"><img src="${escHtml(m.url)}" style="max-width:300px" /><p>${escHtml(m.description || m.title || '')}</p></div>`;
      if (m.type === 'video') return `<div style="margin:10px 0;border:1px solid #ddd;padding:10px"><video src="${escHtml(m.url)}" controls style="max-width:300px"></video><p>${escHtml(m.description || m.title || '')}</p></div>`;
      if (m.type === 'youtube') return `<div style="margin:10px 0;border:1px solid #ddd;padding:10px"><p><strong>YouTube:</strong> ${escHtml(m.title || m.url)}</p><p>${escHtml(m.description || '')}</p></div>`;
      return '';
    }).join('');

    const content = `
      <html><head><title>YDCS Report - ${months[month-1].label} ${year}</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}h2{color:#2563eb;margin-top:30px}.stat{display:inline-block;margin:10px;padding:15px;background:#f0f9ff;border-radius:8px;text-align:center}.stat-value{font-size:24px;font-weight:bold;color:#2563eb}</style>
      </head><body>
      <h1>Yemisrach Dimts Radio Home</h1>
      <h2>Monthly Report - ${months[month-1].label} ${year}</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <h2>Statistics</h2>
      <div class="stat"><div class="stat-value">${groups.length}</div><div>Groups</div></div>
      <div class="stat"><div class="stat-value">${totals.total}</div><div>Members</div></div>
      <div class="stat"><div class="stat-value">${totals.radios}</div><div>Radios</div></div>
      <div class="stat"><div class="stat-value">${totals.agreements}</div><div>Agreements</div></div>
      ${groupsSectionHtml}
      <h2>Testimonial Photos & Videos</h2>
      ${mediaHtml || '<p>No photos or videos for this month.</p>'}
      </body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setMode('month')} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${mode === 'month' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}><Calendar size={16} /> By Month</button>
            <button onClick={() => setMode('range')} className={`px-3 py-2 text-sm font-medium ${mode === 'range' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>Date Range</button>
          </div>
          {mode === 'month' ? (
            <>
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
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">From</span>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" className="w-full sm:w-44" />
              <span className="text-sm text-gray-500 dark:text-gray-400">To</span>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" className="w-full sm:w-44" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadPpt} disabled={mode === 'range'} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"><Download size={16} /> PPT</button>
          {canViewGroups && (
            <button onClick={exportCSV} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"><Download size={16} /> CSV</button>
          )}
          <button onClick={printReport} className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2"><Printer size={16} /> Print</button>
        </div>
      </div>

      <>
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Groups', value: groups.length, icon: FileText, color: 'bg-blue-500' },
                  { label: 'Male', value: totals.male, icon: Users, color: 'bg-cyan-500' },
                  { label: 'Female', value: totals.female, icon: Users, color: 'bg-pink-500' },
                  { label: 'Total Members', value: totals.total, icon: Users, color: 'bg-indigo-500' },
                  { label: 'Radios', value: totals.radios, icon: Radio, color: 'bg-red-500' },
                  { label: 'Agreements', value: totals.agreements, icon: Handshake, color: 'bg-teal-500' },
                  { label: 'Media', value: allMediaItems.length, icon: Image, color: 'bg-purple-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{s.value}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${s.color}`}><s.icon size={18} className="text-white" /></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Members by Gender</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius="55%" outerRadius="78%" dataKey="value" rootTabIndex={-1} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Groups by Regional State</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={(() => {
                      const map = new Map<string, number>();
                      groups.forEach(g => map.set(g.regionalStateName, (map.get(g.regionalStateName) || 0) + 1));
                      return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {canViewGroups && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Groups - {months[month-1].label} {year}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{groups.length} groups found</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                        <th className="text-left px-4 py-3 font-medium">Serial</th>
                        <th className="text-left px-4 py-3 font-medium">Region</th>
                        <th className="text-left px-4 py-3 font-medium">Church</th>
                        <th className="text-left px-4 py-3 font-medium">Leader</th>
                        <th className="text-center px-4 py-3 font-medium">Members</th>
                        <th className="text-center px-4 py-3 font-medium">Radios</th>
                        <th className="text-center px-4 py-3 font-medium">Agreements</th>
                        <th className="text-center px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {pagedGroups.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 font-mono text-primary-600">{g.serialNumber}</td>
                          <td className="px-4 py-3">{g.regionName}</td>
                          <td className="px-4 py-3">{g.churchName}</td>
                          <td className="px-4 py-3">{g.groupLeaderName}</td>
                          <td className="px-4 py-3 text-center">{g.totalMembers}</td>
                          <td className="px-4 py-3 text-center">{g.radioGiven ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 text-center">{g.agreementMade ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              g.status === 'active' ? 'bg-green-100 text-green-700' :
                              g.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>{g.status}</span>
                          </td>
                        </tr>
                      ))}
                      {groups.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No groups found for this month</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {groups.length > GROUPS_PER_PAGE && (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {((groupPage - 1) * GROUPS_PER_PAGE) + 1}–{Math.min(groupPage * GROUPS_PER_PAGE, groups.length)} of {groups.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGroupPage(p => Math.max(1, p - 1))}
                        disabled={groupPage <= 1}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Page {groupPage} of {groupTotalPages}</span>
                      <button
                        onClick={() => setGroupPage(p => Math.min(groupTotalPages, p + 1))}
                        disabled={groupPage >= groupTotalPages}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Photos & Videos Section */}
              {(photos.length > 0 || allVideos.length > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Photos & Videos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {photos.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <Image size={18} className="text-blue-500" /> Photos ({photos.length})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {photos.slice(0, 6).map(p => (
                            <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                              <img src={p.url} alt={p.title || ''} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {photos.length > 6 && (
                            <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                              +{photos.length - 6} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {allVideos.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <Youtube size={18} className="text-red-500" /> Videos ({allVideos.length})
                        </h4>
                        <div className="space-y-3">
                          {allVideos.slice(0, 10).map(v => (
                            <div key={v.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <div className="w-24 h-16 flex-shrink-0 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden flex items-center justify-center">
                                {v.type === 'youtube' ? (
                                  <img
                                    src={v.thumbnailUrl || getYoutubeThumbnail(v.url) || ''}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                                  />
                                ) : (
                                  <Video size={24} className="text-gray-500 dark:text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.title || 'Video'}</p>
                                {v.description && <p className="text-xs text-gray-500 truncate dark:text-gray-400">{v.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
    </div>
  );
}
