import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import { RadioHomeGroup } from '../../types';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const PER_PAGE = 20;

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function EntryLogPage() {
  const now = new Date();
  interface Clerk { id: string; fullName: string; username: string; regionalStateName?: string | null }
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [clerkId, setClerkId] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<RadioHomeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get('/users/clerks')
      .then(({ data }) => setClerks(data.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const entryFrom = toISODate(new Date(year, month - 1, 1));
        const entryTo = toISODate(new Date(year, month, 0));
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PER_PAGE),
          creatorRole: 'data_entry',
          entryFrom,
          entryTo,
        });
        if (clerkId) params.set('createdBy', clerkId);
        const { data } = await api.get(`/groups?${params}`, { signal: controller.signal });
        setEntries(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } catch (err) {
        if (controller.signal.aborted) return;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchEntries();
    return () => controller.abort();
  }, [page, clerkId, year, month]);

  const prevMonth = () => {
    setPage(1);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setPage(1);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const groupsByDay: { day: string; rows: RadioHomeGroup[] }[] = [];
  for (const row of entries) {
    const day = row.createdAt.split('T')[0];
    const last = groupsByDay[groupsByDay.length - 1];
    if (last && last.day === day) last.rows.push(row);
    else groupsByDay.push({ day, rows: [row] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={clerkId}
            onChange={(e) => { setClerkId(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm max-w-full"
          >
            <option value="">All Data Clerks</option>
            {clerks.map(c => <option key={c.id} value={c.id}>{c.fullName}{c.regionalStateName ? ` (${c.regionalStateName})` : ''}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Previous month"><ChevronLeft size={20} /></button>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Calendar size={18} className="text-primary-500" />
              <select value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}
                className="bg-transparent font-medium text-gray-900 dark:text-white text-sm border-none focus:ring-0">
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
                className="bg-transparent font-medium text-gray-900 dark:text-white text-sm border-none focus:ring-0">
                {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map(y =>
                  <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Next month"><ChevronRight size={20} /></button>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
          {total} entr{total === 1 ? 'y' : 'ies'} in {months[month - 1].label} {year}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <ClipboardList size={18} className="text-primary-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Data Entry Log - {months[month - 1].label} {year}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Entered By</th>
                <th className="text-left px-4 py-3 font-medium">Serial #</th>
                <th className="text-left px-4 py-3 font-medium">Date Started</th>
                <th className="text-left px-4 py-3 font-medium">Church</th>
                <th className="text-left px-4 py-3 font-medium">Regional State</th>
                <th className="text-left px-4 py-3 font-medium">Region</th>
                <th className="text-left px-4 py-3 font-medium">Group Leader</th>
                <th className="text-center px-4 py-3 font-medium">Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8"><TableSkeleton rows={5} cols={9} /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  No entries by data clerks in {months[month - 1].label} {year}
                </td></tr>
              ) : groupsByDay.map(group => (
                <FragmentRows key={group.day} day={group.day} dayLabel={dayLabel(group.day)} rows={group.rows} />
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronLeft size={18} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRows({ day, dayLabel, rows }: { day: string; dayLabel: string; rows: RadioHomeGroup[] }) {
  return (
    <>
      <tr className="bg-primary-50/60 dark:bg-primary-900/20">
        <td colSpan={9} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">
          {dayLabel} · {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
        </td>
      </tr>
      {rows.map((g) => (
        <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
            {new Date(g.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </td>
          <td className="px-4 py-3 font-medium">{g.createdByName || 'Unknown'}</td>
          <td className="px-4 py-3 font-mono font-medium text-primary-600 dark:text-primary-400">{g.serialNumber}</td>
          <td className="px-4 py-3 whitespace-nowrap">{g.dateStarted?.split('T')[0] || '-'}</td>
          <td className="px-4 py-3">{g.churchName}</td>
          <td className="px-4 py-3">{g.regionalStateName || '-'}</td>
          <td className="px-4 py-3">{g.regionName}</td>
          <td className="px-4 py-3">{g.groupLeaderName}</td>
          <td className="px-4 py-3 text-center font-medium">{g.totalMembers}</td>
        </tr>
      ))}
    </>
  );
}
