import { useState, useEffect, FormEvent } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, Upload, Download, Calendar } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { RadioHomeGroup, Region, RegionalState, Language } from '../../types';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import DatePicker from '../../components/ui/DatePicker';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { confirmAction } from '../../utils/confirm';

interface ImportResult {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function GroupsPage() {
  const { hasRole, user } = useAuth();
  const { show } = useToast();
  const canImport = hasRole('admin');
  const canCreate = hasRole('admin', 'data_entry', 'radio_assistant');
  const canDelete = hasRole('admin', 'radio_assistant');
  const canEditRow = (g: RadioHomeGroup) => hasRole('admin', 'radio_assistant') || (hasRole('data_entry') && g.createdBy === user?.id);

  const [groups, setGroups] = useState<RadioHomeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ regionalStateId: '', status: '', year: '', month: '' });
  const [GROUPS_PER_PAGE] = useState(15);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RadioHomeGroup | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionalStates, setRegionalStates] = useState<RegionalState[]>([]);
  const [selectedRegionalStateId, setSelectedRegionalStateId] = useState('');

  const [languages, setLanguages] = useState<Language[]>([]);

  const [form, setForm] = useState({
    dateStarted: '', regionName: '', languageId: '', churchName: '',
    groupLeaderName: '', groupLeaderPhone: '', facilitatorName: '', facilitatorPhone: '',
    maleMembers: '', femaleMembers: '', radioGiven: '', agreementMade: '',
    remark: '', status: 'active' as 'active' | 'inactive' | 'closed',
  });

  const fetchGroups = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(GROUPS_PER_PAGE) });
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const { data } = await api.get(`/groups?${params}`, { signal });
      setGroups(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      if (signal?.aborted) return;
      show('Failed to load groups', 'error');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [rs, r, l] = await Promise.all([
        api.get('/regional-states'),
        api.get('/regions/all'),
        api.get('/languages'),
      ]);
      setRegionalStates(rs.data.items || []);
      setRegions(r.data.items || []);
      setLanguages(l.data.items || []);
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    const controller = new AbortController();
    fetchGroups(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters, search]);
  useEffect(() => { fetchLookups(); }, []);

  const openCreate = () => {
    setEditingGroup(null);
    setSelectedRegionalStateId('');
    setForm({ dateStarted: '', regionName: '', languageId: '', churchName: '', groupLeaderName: '', groupLeaderPhone: '', facilitatorName: '', facilitatorPhone: '', maleMembers: '', femaleMembers: '', radioGiven: '', agreementMade: '', remark: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (group: RadioHomeGroup) => {
    setEditingGroup(group);
    setSelectedRegionalStateId(regions.find(r => r.id === group.regionId)?.regionalStateId || group.regionalStateId || '');
    setForm({
      dateStarted: group.dateStarted?.split('T')[0] || '',
      regionName: group.regionName || '',
      languageId: group.languageId || '', churchName: group.churchName || '',
      groupLeaderName: group.groupLeaderName || '', groupLeaderPhone: group.groupLeaderPhone || '',
      facilitatorName: group.facilitatorName || '', facilitatorPhone: group.facilitatorPhone || '',
      maleMembers: String(group.maleMembers ?? 0), femaleMembers: String(group.femaleMembers ?? 0),
      radioGiven: group.radioGiven ? 'yes' : 'no', agreementMade: group.agreementMade ? 'yes' : 'no',
      remark: group.remark || '', status: group.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const male = parseInt(form.maleMembers) || 0;
      const female = parseInt(form.femaleMembers) || 0;
      const total = male + female;
      const yn = (v: string) => v === 'yes' ? 1 : 0;
      const payload = {
        ...form,
        regionalStateId: selectedRegionalStateId,
        maleMembers: male,
        femaleMembers: female,
        radioGiven: yn(form.radioGiven),
        agreementMade: yn(form.agreementMade),
        totalMembers: total,
      };
      if (editingGroup) {
        await api.put(`/groups/${editingGroup.id}`, payload);
        show('Group updated successfully', 'success');
      } else {
        await api.post('/groups', payload);
        show('Group created successfully', 'success');
      }
      setShowModal(false);
      fetchGroups();
    } catch (err: any) {
      const details = err?.response?.data?.errors
        ?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`)
        .join('; ');
      show(details || err?.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction('Are you sure you want to delete this group?'))) return;
    try {
      await api.delete(`/groups/${id}`);
      show('Group deleted', 'success');
      fetchGroups();
    } catch (err) {
      show('Delete failed', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirm.trim().toUpperCase() !== 'DELETE') return;
    setDeletingAll(true);
    try {
      const { data } = await api.delete('/groups/all');
      show(data.message || 'All data deleted', 'success');
      setShowDeleteAll(false);
      setDeleteAllConfirm('');
      fetchGroups();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setDeletingAll(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Date Started', 'Regional State', 'Region', 'Language', 'Church Name', 'Group Leader Name', 'Group Leader Phone', 'Facilitator Name', 'Facilitator Phone', 'Male Members', 'Female Members', 'Radios Given', 'Agreements Made', 'Remark', 'Status'];
    const sample = ['2026-01-15', 'Oromia', 'Adama', 'Oromiffa', 'St. Mary Church', 'Abebe Kebede', '0911000000', 'Tigist Bekele', '0912000000', '12', '10', 'Yes', 'Yes', '', 'Active'];
    const csv = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ydcs-groups-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/groups/import', formData);
      setImportResult({ imported: data.imported, failed: data.failed, errors: data.errors || [] });
      show(data.message || 'Import complete', data.failed > 0 ? 'warning' : 'success');
      fetchGroups();
    } catch (err: any) {
      show(err?.response?.data?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleRegionalStateChange = (rsId: string) => {
    setSelectedRegionalStateId(rsId);
    setForm(prev => {
      if (editingGroup) return prev;
      const rs = regionalStates.find(s => s.id === rsId);
      const defaultLang = languages.find(l => l.name === rs?.defaultLanguage);
      return { ...prev, languageId: prev.languageId || (defaultLang?.id || '') };
    });
  };

  const updateFilter = (key: string, value: string) => {
    setPage(1);
    if (key === 'month' && value && !filters.year) {
      setFilters(p => ({ ...p, month: value, year: String(new Date().getFullYear()) }));
    } else {
      setFilters(p => ({ ...p, [key]: value }));
    }
  };

  const shiftMonth = (dir: 1 | -1) => {
    let y = filters.year ? Number(filters.year) : new Date().getFullYear();
    let m = filters.month ? Number(filters.month) : new Date().getMonth() + 1;
    m += dir;
    if (m === 0) { m = 12; y -= 1; }
    if (m === 13) { m = 1; y += 1; }
    setPage(1);
    setFilters(p => ({ ...p, month: String(m), year: String(y) }));
  };

  const selectedPeriodLabel = filters.month && filters.year
    ? `${months[Number(filters.month) - 1].label} ${filters.year}`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text" placeholder="Search by serial, leader, facilitator, church, region, state..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        {(canImport || canCreate) && (
          <div className="flex flex-wrap gap-2">
            {canImport && (
              <button onClick={() => setShowImport(true)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <Upload size={20} /> Import Excel
              </button>
            )}
            {canImport && (
              <button onClick={() => setShowDeleteAll(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2">
                <Trash2 size={20} /> Delete All Data
              </button>
            )}
            {canCreate && (
              <button onClick={openCreate} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2">
                <Plus size={20} /> New Group
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={filters.regionalStateId} onChange={(e) => updateFilter('regionalStateId', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
          <option value="">All Regional States</option>
          {regionalStates.map(rs => <option key={rs.id} value={rs.id}>{rs.name}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Previous month"><ChevronLeft size={20} /></button>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Calendar size={18} className="text-primary-500" />
            <select value={filters.month} onChange={(e) => updateFilter('month', e.target.value)}
              className="bg-transparent font-medium text-gray-900 dark:text-white text-sm border-none focus:ring-0">
              <option value="">All Months</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={filters.year} onChange={(e) => updateFilter('year', e.target.value)}
              className="bg-transparent font-medium text-gray-900 dark:text-white text-sm border-none focus:ring-0">
              <option value="">All Years</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y =>
                <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Next month"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-primary-500" />
            Radio Home Groups{selectedPeriodLabel ? ` - ${selectedPeriodLabel}` : ''}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{total} group{total === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Date Started</th>
                <th className="text-left px-4 py-3 font-medium">Serial #</th>
                <th className="text-left px-4 py-3 font-medium">Regional State</th>
                <th className="text-left px-4 py-3 font-medium">Region</th>
                <th className="text-left px-4 py-3 font-medium">Language</th>
                <th className="text-left px-4 py-3 font-medium">Church</th>
                <th className="text-left px-4 py-3 font-medium">Group Leader</th>
                <th className="text-left px-4 py-3 font-medium">Leader Phone</th>
                <th className="text-left px-4 py-3 font-medium">Facilitator</th>
                <th className="text-left px-4 py-3 font-medium">Facilitator Phone</th>
                <th className="text-center px-4 py-3 font-medium">Male</th>
                <th className="text-center px-4 py-3 font-medium">Female</th>
                <th className="text-center px-4 py-3 font-medium">Total Members</th>
                <th className="text-center px-4 py-3 font-medium">Radios</th>
                <th className="text-center px-4 py-3 font-medium">Agreements</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Remark</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={18} className="px-4 py-8"><TableSkeleton rows={5} cols={17} /></td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={18} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No groups found</td></tr>
              ) : groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 whitespace-nowrap">{g.dateStarted?.split('T')[0] || '-'}</td>
                  <td className="px-4 py-3 font-mono font-medium text-primary-600 dark:text-primary-400">{g.serialNumber}</td>
                  <td className="px-4 py-3">{g.regionalStateName || '-'}</td>
                  <td className="px-4 py-3">{g.regionName}</td>
                  <td className="px-4 py-3">{g.languageName || '-'}</td>
                  <td className="px-4 py-3">{g.churchName}</td>
                  <td className="px-4 py-3">{g.groupLeaderName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{g.groupLeaderPhone}</td>
                  <td className="px-4 py-3">{g.facilitatorName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{g.facilitatorPhone}</td>
                  <td className="px-4 py-3 text-center">{g.maleMembers}</td>
                  <td className="px-4 py-3 text-center">{g.femaleMembers}</td>
                  <td className="px-4 py-3 text-center font-medium">{g.totalMembers}</td>
                  <td className="px-4 py-3 text-center">{g.radioGiven ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-center">{g.agreementMade ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      g.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      g.status === 'inactive' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>{g.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs">{g.remark || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {canEditRow(g) && (
                        <button onClick={() => openEdit(g)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500" title="View/Edit"><Edit2 size={16} /></button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(g.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500" title="Delete"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((page - 1) * GROUPS_PER_PAGE) + 1}–{Math.min(page * GROUPS_PER_PAGE, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronLeft size={18} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingGroup ? 'Edit Group' : 'Create Group'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Started</label>
              <DatePicker value={form.dateStarted} onChange={(v) => setForm(p => ({ ...p, dateStarted: v }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Regional State <span className="text-red-500">*</span></label>
              <select value={selectedRegionalStateId} onChange={e => handleRegionalStateChange(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Select Regional State</option>
                {regionalStates.map(rs => <option key={rs.id} value={rs.id}>{rs.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Region <span className="text-red-500">*</span></label>
              <input type="text" value={form.regionName} onChange={e => setForm(p => ({ ...p, regionName: e.target.value }))}
                placeholder="Type region name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
              <SearchableSelect
                options={languages.map(l => ({ value: l.id, label: l.name }))}
                value={form.languageId}
                onChange={v => setForm(p => ({ ...p, languageId: v }))}
                placeholder="Select Language"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Church Name</label>
              <input type="text" value={form.churchName} onChange={e => setForm(p => ({ ...p, churchName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Leader Name</label>
              <input type="text" value={form.groupLeaderName} onChange={e => setForm(p => ({ ...p, groupLeaderName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Leader Phone</label>
              <input type="text" value={form.groupLeaderPhone} onChange={e => setForm(p => ({ ...p, groupLeaderPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facilitator Name</label>
              <input type="text" value={form.facilitatorName} onChange={e => setForm(p => ({ ...p, facilitatorName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facilitator Phone</label>
              <input type="text" value={form.facilitatorPhone} onChange={e => setForm(p => ({ ...p, facilitatorPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Male Members</label>
              <input type="number" min="0" value={form.maleMembers} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setForm(p => ({ ...p, maleMembers: v })); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Female Members</label>
              <input type="number" min="0" value={form.femaleMembers} onChange={e => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setForm(p => ({ ...p, femaleMembers: v })); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Members</label>
              <input type="number" value={(() => { const m = parseInt(form.maleMembers) || 0; const f = parseInt(form.femaleMembers) || 0; return m + f || ''; })()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Radios Given</label>
              <div className="flex gap-4 mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="radioGiven" value="yes" checked={form.radioGiven === 'yes'} onChange={() => setForm(p => ({ ...p, radioGiven: 'yes' }))} className="text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="radioGiven" value="no" checked={form.radioGiven === 'no'} onChange={() => setForm(p => ({ ...p, radioGiven: 'no' }))} className="text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agreements Made</label>
              <div className="flex gap-4 mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="agreementMade" value="yes" checked={form.agreementMade === 'yes'} onChange={() => setForm(p => ({ ...p, agreementMade: 'yes' }))} className="text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="agreementMade" value="no" checked={form.agreementMade === 'no'} onChange={() => setForm(p => ({ ...p, agreementMade: 'no' }))} className="text-primary-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remark</label>
            <textarea value={form.remark} onChange={e => setForm(p => ({ ...p, remark: e.target.value }))} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">{editingGroup ? 'Update' : 'Create'} Group</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Import Groups from Excel" size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Upload an Excel (.xlsx) or CSV file. Columns must match the group form:
              Date Started, Regional State, Region, Language, Church Name, Group Leader Name, Group Leader Phone,
              Facilitator Name, Facilitator Phone, Male Members, Female Members, Radios Given, Agreements Made, Remark, Status.
            </p>
            <button onClick={downloadTemplate} className="shrink-0 ml-3 px-3 py-2 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800">
              <Download size={16} /> Template
            </button>
          </div>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload size={24} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{importing ? 'Importing...' : 'Click to select Excel/CSV file'}</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv (max 20MB)</p>
            </div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" disabled={importing} />
          </label>

          {importResult && (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm font-medium ${importResult.failed > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                <span>{importResult.imported} imported</span>
                {importResult.failed > 0 && <span>/ {importResult.failed} failed</span>}
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Row</th>
                        <th className="text-left px-3 py-2 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {importResult.errors.slice(0, 50).map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{e.row}</td>
                          <td className="px-3 py-2 text-red-500">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="button" onClick={() => setShowImport(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Close</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDeleteAll} onClose={() => setShowDeleteAll(false)} title="Delete All Data" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-300">
              This will permanently delete <strong>all groups</strong> and their attached media, and reset
              serial number sequences. This action cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteAllConfirm}
              onChange={(e) => setDeleteAllConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowDeleteAll(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deleteAllConfirm.trim().toUpperCase() !== 'DELETE' || deletingAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg"
            >
              {deletingAll ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
