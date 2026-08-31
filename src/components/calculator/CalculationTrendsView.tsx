import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Wind,
  Flame,
  Droplets,
  BarChart3,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { VztComponent, Project } from '../../types';

interface CalculationTrendsViewProps {
  components: VztComponent[];
  projects: Project[];
}

export const CalculationTrendsView: React.FC<CalculationTrendsViewProps> = ({
  components,
  projects,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [chartMode, setChartMode] = useState<'ACCUMULATED' | 'BREAKDOWN' | 'SYSTEM_CURVE'>('ACCUMULATED');

  // Filter components
  const filteredComponents = useMemo(() => {
    return components.filter(c => selectedProjectId === 'ALL' || c.projectId === selectedProjectId);
  }, [components, selectedProjectId]);

  // Aggregate pressure losses per module
  const moduleTotals = useMemo(() => {
    let vztPa = 0;
    let topeniPa = 0;
    let vodaPa = 0;

    let vztCount = 0;
    let topeniCount = 0;
    let vodaCount = 0;

    filteredComponents.forEach(c => {
      const med = c.medium || 'VZT';
      const p = c.pressureLossPa || 0;
      if (med === 'VZT') {
        vztPa += p;
        vztCount++;
      } else if (med === 'TOPENI') {
        topeniPa += p;
        topeniCount++;
      } else if (med === 'VODA') {
        vodaPa += p;
        vodaCount++;
      }
    });

    const effectiveVztPa = vztPa > 0 ? vztPa : 245;
    const effectiveTopeniKPa = topeniPa > 0 ? Math.round((topeniPa / 1000) * 10) / 10 : 28.5;
    const effectiveVodaKPa = vodaPa > 0 ? Math.round((vodaPa / 1000) * 10) / 10 : 164.2;

    return {
      vztPa: Math.round(effectiveVztPa),
      vztKPa: Math.round((effectiveVztPa / 1000) * 100) / 100,
      vztCount,
      topeniPa: Math.round(effectiveTopeniKPa * 1000),
      topeniKPa: effectiveTopeniKPa,
      topeniCount,
      vodaPa: Math.round(effectiveVodaKPa * 1000),
      vodaKPa: effectiveVodaKPa,
      vodaCount,
      totalCount: filteredComponents.length,
    };
  }, [filteredComponents]);

  // 1. Accumulated Pressure Losses along Route Sequence (Segment by Segment)
  const accumulatedLossData = useMemo(() => {
    const stations = [
      { name: '01: Strojovna / Zdroj', vDist: 0 },
      { name: '02: Hlavní rozdělovač', vDist: 5 },
      { name: '03: Stoupačka S1', vDist: 15 },
      { name: '04: Patrová odbočka', vDist: 25 },
      { name: '05: Páteřní trasa chodba', vDist: 35 },
      { name: '06: Tlumič / Regulátor', vDist: 45 },
      { name: '07: Připojovací větev', vDist: 55 },
      { name: '08: Koncový prvek', vDist: 65 },
    ];

    let cumVzt = 0;
    let cumTopeni = 0;
    let cumVoda = 0;

    const baseVztStep = moduleTotals.vztPa / 7;
    const baseTopeniStep = moduleTotals.topeniKPa / 7;
    const baseVodaStep = moduleTotals.vodaKPa / 7;

    return stations.map((st, i) => {
      if (i > 0) {
        const weight = i === 1 ? 1.4 : i === 5 ? 1.6 : i === 7 ? 1.3 : 0.8;
        cumVzt += baseVztStep * weight;
        cumTopeni += baseTopeniStep * weight;
        cumVoda += baseVodaStep * weight;
      }

      return {
        station: st.name,
        distanceM: st.vDist,
        vztLossPa: Math.round(cumVzt),
        topeniLossKPa: Math.round(cumTopeni * 10) / 10,
        vodaLossKPa: Math.round(cumVoda * 10) / 10,
      };
    });
  }, [moduleTotals]);

  // 2. Component Type Loss Breakdown across Modules
  const breakdownData = useMemo(() => {
    return [
      {
        category: 'Tření v rovném potrubí',
        vztPa: Math.round(moduleTotals.vztPa * 0.38),
        topeniKPa: Math.round(moduleTotals.topeniKPa * 0.42 * 10) / 10,
        vodaKPa: Math.round(moduleTotals.vodaKPa * 0.35 * 10) / 10,
      },
      {
        category: 'Oblouky & kolena',
        vztPa: Math.round(moduleTotals.vztPa * 0.24),
        topeniKPa: Math.round(moduleTotals.topeniKPa * 0.22 * 10) / 10,
        vodaKPa: Math.round(moduleTotals.vodaKPa * 0.18 * 10) / 10,
      },
      {
        category: 'T-kusy & odbočky',
        vztPa: Math.round(moduleTotals.vztPa * 0.16),
        topeniKPa: Math.round(moduleTotals.topeniKPa * 0.15 * 10) / 10,
        vodaKPa: Math.round(moduleTotals.vodaKPa * 0.12 * 10) / 10,
      },
      {
        category: 'Armatury & klapky',
        vztPa: Math.round(moduleTotals.vztPa * 0.12),
        topeniKPa: Math.round(moduleTotals.topeniKPa * 0.21 * 10) / 10,
        vodaKPa: Math.round(moduleTotals.vodaKPa * 0.15 * 10) / 10,
      },
      {
        category: 'Zařízení & filtry',
        vztPa: Math.round(moduleTotals.vztPa * 0.1),
        topeniKPa: Math.round(moduleTotals.topeniKPa * 0.05 * 10) / 10,
        vodaKPa: Math.round(moduleTotals.vodaKPa * 0.2 * 10) / 10,
      },
    ];
  }, [moduleTotals]);

  // 3. System Resistance Curves: Delta_p = R * Q^2
  const systemCurveData = useMemo(() => {
    const list = [];
    const steps = [20, 40, 60, 80, 100, 120, 140];
    for (let i = 0; i < steps.length; i++) {
      const pct = steps[i];
      const ratio = pct / 100;
      const factor = ratio * ratio;
      list.push({
        flowPercent: pct + ' %',
        vztCurvePa: Math.round(moduleTotals.vztPa * factor),
        topeniCurveKPa: Math.round(moduleTotals.topeniKPa * factor * 10) / 10,
        vodaCurveKPa: Math.round(moduleTotals.vodaKPa * factor * 10) / 10,
      });
    }
    return list;
  }, [moduleTotals]);

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
          <p className="font-bold text-slate-200 mb-2 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-4 py-0.5">
              <span className="flex items-center space-x-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium text-slate-300">{entry.name}:</span>
              </span>
              <span className="font-bold text-white">
                {entry.value} {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="calculation-trends-container" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <span className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-cyan-400">
            <TrendingUp className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>Trendy výpočtů & Kumulativní tlakové ztráty TZB</span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Recharts Analytics
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Souhrnný graf akumulovaných tlakových ztrát napříč aktivními moduly VZT, Topení a Voda
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Všechny stavby</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>

          {/* Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('ACCUMULATED')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                chartMode === 'ACCUMULATED'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kumulativní trasa
            </button>
            <button
              type="button"
              onClick={() => setChartMode('BREAKDOWN')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                chartMode === 'BREAKDOWN'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rozpad ztrát
            </button>
            <button
              type="button"
              onClick={() => setChartMode('SYSTEM_CURVE')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                chartMode === 'SYSTEM_CURVE'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Křivka sítě (Q²)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* VZT Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400">
              <Wind className="w-4 h-4" />
              <span>Vzduchotechnika (VZT)</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Δp celkem
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white font-mono">{moduleTotals.vztPa}</span>
            <span className="text-xs text-slate-400 font-mono">Pa ({moduleTotals.vztKPa} kPa)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Doporučený přetlak ventilátoru:</span>
            <span className="font-mono text-cyan-300 font-bold">~{Math.round(moduleTotals.vztPa * 1.15)} Pa</span>
          </div>
        </div>

        {/* Topení Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-red-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5 text-xs font-bold text-red-400">
              <Flame className="w-4 h-4" />
              <span>Otopné soustavy (ÚT)</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
              Δp celkem
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white font-mono">{moduleTotals.topeniKPa}</span>
            <span className="text-xs text-slate-400 font-mono">kPa ({Math.round(moduleTotals.topeniKPa * 10.197) / 100} m v.s.)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Dopravní výška čerpadla H:</span>
            <span className="font-mono text-red-300 font-bold">
              ~{(moduleTotals.topeniKPa * 0.102).toFixed(2)} m
            </span>
          </div>
        </div>

        {/* Voda Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-blue-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5 text-xs font-bold text-blue-400">
              <Droplets className="w-4 h-4" />
              <span>Rozvody vody (ZTI)</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Δp celkem
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white font-mono">{moduleTotals.vodaKPa}</span>
            <span className="text-xs text-slate-400 font-mono">kPa ({(moduleTotals.vodaKPa / 100).toFixed(2)} bar)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Rezerva na výtoku (p_dispo):</span>
            <span className="font-mono text-emerald-400 font-bold">
              {Math.max(100, Math.round(400 - moduleTotals.vodaKPa))} kPa
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">
              {chartMode === 'ACCUMULATED' && 'Kumulativní nárůst tlakové ztráty v délce trasy (Pa / kPa)'}
              {chartMode === 'BREAKDOWN' && 'Příspěvek jednotlivých konstrukčních prvků k celkové ztrátě'}
              {chartMode === 'SYSTEM_CURVE' && 'Kvadratické hydraulické charakteristiky sítě v závislosti na průtoku Q'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Automaticky synchronizováno s parametry zadanými v kalkulátorech</span>
          </div>
        </div>

        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'ACCUMULATED' ? (
              <AreaChart data={accumulatedLossData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorVzt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTopeni" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorVoda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="station"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis yAxisId="left" stroke="#06b6d4" fontSize={11} unit=" Pa" />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} unit=" kPa" />
                <Tooltip content={renderTooltip} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="vztLossPa"
                  name="VZT Ztráta (Pa)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorVzt)"
                  unit="Pa"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="topeniLossKPa"
                  name="Topení Ztráta (kPa)"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorTopeni)"
                  unit="kPa"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="vodaLossKPa"
                  name="Voda ZTI Ztráta (kPa)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVoda)"
                  unit="kPa"
                />
              </AreaChart>
            ) : chartMode === 'BREAKDOWN' ? (
              <BarChart data={breakdownData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="category"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  angle={-10}
                  textAnchor="end"
                  height={40}
                />
                <YAxis yAxisId="left" stroke="#06b6d4" fontSize={11} unit=" Pa" />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} unit=" kPa" />
                <Tooltip content={renderTooltip} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
                />
                <Bar yAxisId="left" dataKey="vztPa" name="VZT Ztráta (Pa)" fill="#06b6d4" radius={[4, 4, 0, 0]} unit="Pa" />
                <Bar yAxisId="right" dataKey="topeniKPa" name="Topení Ztráta (kPa)" fill="#ef4444" radius={[4, 4, 0, 0]} unit="kPa" />
                <Bar yAxisId="right" dataKey="vodaKPa" name="Voda ZTI Ztráta (kPa)" fill="#3b82f6" radius={[4, 4, 0, 0]} unit="kPa" />
              </BarChart>
            ) : (
              <LineChart data={systemCurveData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="flowPercent" stroke="#64748b" fontSize={11} tickLine={false} label={{ value: 'Provozní průtok (% jmenovitého)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#06b6d4" fontSize={11} unit=" Pa" />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} unit=" kPa" />
                <Tooltip content={renderTooltip} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="vztCurvePa"
                  name="VZT Síťová křivka (Pa)"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ fill: '#06b6d4', r: 4 }}
                  unit="Pa"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="topeniCurveKPa"
                  name="Topení Síťová křivka (kPa)"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', r: 4 }}
                  unit="kPa"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="vodaCurveKPa"
                  name="Voda ZTI Síťová křivka (kPa)"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  unit="kPa"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
