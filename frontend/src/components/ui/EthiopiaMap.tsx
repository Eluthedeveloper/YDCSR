import { useMemo, useState } from 'react';
import {
  ETHIOPIA_GEOMETRY,
  ETHIOPIA_RENDER_ORDER,
  ETHIOPIAN_REGIONS,
  ETHIOPIA_VIEWBOX,
} from 'ethiopia-regions-map';

export interface RegionalStateStat {
  regionalStateId: string;
  name: string;
  code: string;
  groupCount: number;
  totalMale: number;
  totalFemale: number;
  totalMembers: number;
  totalRadios: number;
  totalAgreements: number;
  churchCount: number;
}

const DB_TO_MAP_CODE: Record<string, string> = {
  OR: 'OR',
  AMH: 'AM',
  AA: 'AA',
  TIG: 'TI',
  SOM: 'SO',
  SID: 'SI',
  HAR: 'HA',
  AFR: 'AF',
  GAM: 'GA',
  BEN: 'BG',
  SE: 'SE',
  SWE: 'SW',
  CE: 'CE',
  DD: 'DD',
};

const REGION_NAME: Record<string, string> = Object.fromEntries(
  ETHIOPIAN_REGIONS.map((r) => [r.code, r.name])
);

const REGION_FILL: Record<string, string> = {
  TI: '#3b82f6',
  AF: '#14b8a6',
  AM: '#f59e0b',
  BG: '#6366f1',
  OR: '#22c55e',
  SO: '#ef4444',
  GA: '#10b981',
  SW: '#06b6d4',
  CE: '#84cc16',
  SE: '#a855f7',
  SI: '#ec4899',
  HA: '#f97316',
  DD: '#eab308',
  AA: '#8b5cf6',
};

const NO_DATA = '#e5e7eb';

interface EthiopiaMapProps {
  stats: RegionalStateStat[];
  loading?: boolean;
}

export default function EthiopiaMap({ stats, loading }: EthiopiaMapProps) {
  const [selectedMapCode, setSelectedMapCode] = useState<string | null>(null);

  const statsByMapCode = useMemo(() => {
    const map: Record<string, RegionalStateStat> = {};
    stats.forEach((s) => {
      const mapCode = DB_TO_MAP_CODE[s.code];
      if (mapCode) map[mapCode] = s;
    });
    return map;
  }, [stats]);

  const selectedStat = selectedMapCode ? statsByMapCode[selectedMapCode] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <svg viewBox={`0 0 ${ETHIOPIA_VIEWBOX.width} ${ETHIOPIA_VIEWBOX.height}`} className="w-full h-auto">
          {ETHIOPIA_RENDER_ORDER.map((code) => {
            const geom = ETHIOPIA_GEOMETRY[code];
            const stat = statsByMapCode[code];
            const count = stat?.groupCount || 0;
            const isSelected = selectedMapCode === code;
            const hasData = !!stat && count > 0;
            return (
              <path
                key={code}
                d={geom.d}
                fill={loading ? NO_DATA : REGION_FILL[code]}
                opacity={loading ? 1 : hasData ? 1 : 0.45}
                stroke={isSelected ? '#111827' : '#ffffff'}
                strokeWidth={isSelected ? 2 : 0.8}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => setSelectedMapCode(isSelected ? null : code)}
              >
                <title>
                  {REGION_NAME[code]}: {count} groups
                </title>
              </path>
            );
          })}
          {ETHIOPIA_RENDER_ORDER.map((code) => {
            const [cx, cy] = ETHIOPIA_GEOMETRY[code].centroid;
            const count = statsByMapCode[code]?.groupCount || 0;
            if (count <= 0) return null;
            return (
              <text
                key={`label-${code}`}
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none fill-white text-sm font-semibold select-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
              >
                {count}
              </text>
            );
          })}
        </svg>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {ETHIOPIA_RENDER_ORDER.map((code) => (
            <div key={code} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: REGION_FILL[code], opacity: statsByMapCode[code]?.groupCount ? 1 : 0.45 }}
              />
              {REGION_NAME[code]}
            </div>
          ))}
        </div>
      </div>

      <div className="lg:w-80 shrink-0">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center text-gray-400 text-sm h-64 flex items-center justify-center">
            Loading map data...
          </div>
        ) : selectedStat ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate min-w-0">{selectedStat.name}</h4>
              <button
                onClick={() => setSelectedMapCode(null)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Radio Home Groups', value: selectedStat.groupCount },
                { label: 'Male Members', value: selectedStat.totalMale },
                { label: 'Female Members', value: selectedStat.totalFemale },
                { label: 'Total Members', value: selectedStat.totalMembers },
                { label: 'Radios Given', value: selectedStat.totalRadios },
                { label: 'Agreements Made', value: selectedStat.totalAgreements },
                { label: 'Churches', value: selectedStat.churchCount },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-64 flex flex-col items-center justify-center text-center text-gray-400">
            <svg viewBox={`0 0 ${ETHIOPIA_VIEWBOX.width} ${ETHIOPIA_VIEWBOX.height}`} className="w-32 h-auto opacity-20 mb-4">
              {ETHIOPIA_RENDER_ORDER.map((code) => (
                <path key={code} d={ETHIOPIA_GEOMETRY[code].d} fill="#9ca3af" stroke="#ffffff" strokeWidth={0.8} />
              ))}
            </svg>
            <p className="text-sm">Click a regional state on the map to see its statistics.</p>
          </div>
        )}
      </div>
    </div>
  );
}
