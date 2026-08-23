import { useState, useEffect } from 'react';
import { Users, Radio, UserCheck, UserCog, Users2, Building2, Map as MapIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import api from '../../services/api';
import { DashboardStats } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/charts/StatCard';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import EthiopiaMap, { RegionalStateStat } from '../../components/ui/EthiopiaMap';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const canViewRadioDistribution = hasRole('admin', 'radio_assistant');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [groupsByRegionalState, setGroupsByRegionalState] = useState<any[]>([]);
  const [groupsByLanguage, setGroupsByLanguage] = useState<any[]>([]);
  const [monthlyGroups, setMonthlyGroups] = useState<any[]>([]);
  const [radiosByMonth, setRadiosByMonth] = useState<any[]>([]);
  const [agreementsByMonth, setAgreementsByMonth] = useState<any[]>([]);
  const [membersByGender, setMembersByGender] = useState({ male: 0, female: 0 });
  const [regionalStats, setRegionalStats] = useState<RegionalStateStat[]>([]);
  const [radiosByRegionalState, setRadiosByRegionalState] = useState<any[]>([]);
  const [radiosByFacilitator, setRadiosByFacilitator] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const year = new Date().getFullYear();
        const radioRequests = canViewRadioDistribution
          ? [
              api.get('/dashboard/radios-by-regional-state', { signal: controller.signal }),
              api.get('/dashboard/radios-by-facilitator', { signal: controller.signal }),
            ]
          : [];
        const [s, rg, lg, mg, rm, am, gd, rs, rr, rf] = await Promise.all([
          api.get('/dashboard/stats', { signal: controller.signal }),
          api.get('/dashboard/groups-by-regional-state', { signal: controller.signal }),
          api.get('/dashboard/groups-by-language', { signal: controller.signal }),
          api.get(`/dashboard/monthly-groups?year=${year}`, { signal: controller.signal }),
          api.get(`/dashboard/radios-by-month?year=${year}`, { signal: controller.signal }),
          api.get(`/dashboard/agreements-by-month?year=${year}`, { signal: controller.signal }),
          api.get('/dashboard/members-by-gender', { signal: controller.signal }),
          api.get('/dashboard/stats-by-regional-state', { signal: controller.signal }),
          ...radioRequests,
        ]);
        setStats(s.data.data);
        setGroupsByRegionalState(rg.data.data || []);
        setGroupsByLanguage(lg.data.data || []);
        setMonthlyGroups(mg.data.data || []);
        setRadiosByMonth(rm.data.data || []);
        setAgreementsByMonth(am.data.data || []);
        setMembersByGender(gd.data.data || { male: 0, female: 0 });
        const rsData = rs.data.data || [];
        const rrData = canViewRadioDistribution ? (rr.data.data || []) : [];
        if (rrData.length > 0) {
          const radioMap = new Map<string, number>(rrData.map((r: any) => [String(r.regionalStateName), Number(r.total)]));
          rsData.forEach((s: RegionalStateStat) => {
            const match = radioMap.get(s.name);
            if (match !== undefined) s.totalRadios = match;
          });
        }
        setRegionalStats(rsData);
        if (canViewRadioDistribution) {
          setRadiosByRegionalState(rrData);
          setRadiosByFacilitator(rf.data.data || []);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Dashboard fetch error:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [canViewRadioDistribution]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const monthlyData = months.map((name, i) => ({
    name,
    groups: monthlyGroups.find((m: any) => m.month === i + 1)?.count || 0,
    radios: radiosByMonth.find((m: any) => m.month === i + 1)?.total || 0,
    agreements: agreementsByMonth.find((m: any) => m.month === i + 1)?.total || 0,
  }));

  const genderData = [
    { name: 'Male', value: Number(membersByGender.male) || 0 },
    { name: 'Female', value: Number(membersByGender.female) || 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Group Established" value={stats?.totalGroups || 0} icon={Building2} color="bg-green-500" />
        <StatCard title="Male Members" value={stats?.totalMaleMembers || 0} icon={UserCheck} color="bg-cyan-500" />
        <StatCard title="Female Members" value={stats?.totalFemaleMembers || 0} icon={UserCog} color="bg-pink-500" />
        <StatCard title="Total Members" value={stats?.totalMembers || 0} icon={Users2} color="bg-indigo-500" />
        <StatCard title="Radios Distributed" value={stats?.totalRadios || 0} icon={Radio} color="bg-red-500" />
        <StatCard title="Viewers" value={stats?.totalViewers || 0} icon={Users} color="bg-rose-500" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-blue-500" />
            Radio Home Groups by Regional State
          </h3>
        </div>
        <EthiopiaMap stats={regionalStats} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Groups by Regional State</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={groupsByRegionalState}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="regionalStateName" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Members by Gender</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} dataKey="value" rootTabIndex={-1} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Groups Created</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="groups" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Groups by Language</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={groupsByLanguage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" />
              <YAxis dataKey="languageName" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {canViewRadioDistribution && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-500" />
              Radios Distributed by Regional State
            </h3>
          {radiosByRegionalState.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No radio distribution data yet</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2.5">
              {radiosByRegionalState.map((r, i) => {
                const max = radiosByRegionalState[0]?.total || 1;
                return (
                  <div key={r.regionalStateName || i} className="flex items-center gap-3">
                    <span className="w-6 text-right text-xs text-gray-400">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 dark:text-white truncate">{r.regionalStateName}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{r.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${(r.total / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}

        {canViewRadioDistribution && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-500" />
              Radios Distributed by Facilitator
            </h3>
          {radiosByFacilitator.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No radio distribution data yet</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2.5">
              {radiosByFacilitator.map((r, i) => {
                const max = radiosByFacilitator[0]?.total || 1;
                return (
                  <div key={r.facilitatorName || i} className="flex items-center gap-3">
                    <span className="w-6 text-right text-xs text-gray-400">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 dark:text-white truncate">{r.facilitatorName}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{r.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${(r.total / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
