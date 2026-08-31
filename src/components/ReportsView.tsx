import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  Building2,
  Users,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  Percent,
} from 'lucide-react';
import { Project, Invoice, VztComponent, AttendanceRecord } from '../types';

interface ReportsViewProps {
  projects: Project[];
  invoices: Invoice[];
  components: VztComponent[];
  attendance: AttendanceRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  projects,
  invoices,
  components,
  attendance,
}) => {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Calculations
  const totalInvoiced = invoices
    .filter(i => i.status === 'ZAPLACENO' || i.status === 'ISSUED')
    .reduce((acc, i) => acc + (i.amountTotal || i.amount || 0), 0);

  const totalPaid = invoices
    .filter(i => i.status === 'ZAPLACENO')
    .reduce((acc, i) => acc + (i.amountTotal || i.amount || 0), 0);

  const totalM2Manufactured = components.reduce((acc, c) => acc + c.surfaceArea, 0);
  const totalWeightKg = components.reduce((acc, c) => acc + c.weight, 0);
  const totalVztRevenue = components.reduce((acc, c) => acc + c.sellPrice, 0);
  const totalVztCost = components.reduce((acc, c) => acc + c.costPrice, 0);
  const averageVztMargin = totalVztRevenue > 0 ? Math.round(((totalVztRevenue - totalVztCost) / totalVztRevenue) * 100) : 48;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              Executive BI Analytics
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>Finanční Reporty & Ziskovost Staveb</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Manažerské ukazatele: Cashflow, marže na m² plechu, vytížení montážních kapacit a plnění rozpočtů
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === 'month' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
              }`}
            >
              Měsíc
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === 'quarter' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
              }`}
            >
              Kvartál
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === 'year' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
              }`}
            >
              Rok 2026
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Exportovat PDF / XLSX</span>
          </button>
        </div>
      </div>

      {/* KPI 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Fakturace celkem</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {totalInvoiced.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Uhrazeno: {totalPaid.toLocaleString('cs-CZ')} Kč</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Průměrná VZT marže</span>
            <Percent className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-2 font-mono">
            +{averageVztMargin}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Nákup vs. prodej m² plechu</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Vyrobeno plechu</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {totalM2Manufactured.toFixed(1)} m²
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Hmotnost: {totalWeightKg.toFixed(1)} kg</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Aktivní projekty</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {projects.filter(p => p.status === 'ACTIVE').length} stavby
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Rozpočet: {(projects.reduce((a, p) => a + (p.budget || 0), 0) / 1000000).toFixed(1)} mil. Kč
          </div>
        </div>
      </div>

      {/* Projects Profitability Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <span>Plnění Rozpočtů & Ziskovost Staveb</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Stavba & Kód</th>
                <th className="py-3 px-4">Klient / Investor</th>
                <th className="py-3 px-4">Rozpočet stavby</th>
                <th className="py-3 px-4">Vyfakturováno</th>
                <th className="py-3 px-4">Plnění (%)</th>
                <th className="py-3 px-4">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projects.map(prj => {
                const prjInvoices = invoices.filter(i => i.projectId === prj.id);
                const billed = prjInvoices.reduce((a, i) => a + (i.amountTotal || 0), 0);
                const budget = prj.budget || 1000000;
                const pct = Math.min(100, Math.round((billed / budget) * 100));

                return (
                  <tr key={prj.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200 text-sm">{prj.name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{prj.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-semibold">{prj.clientName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {budget.toLocaleString('cs-CZ')} Kč
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {billed.toLocaleString('cs-CZ')} Kč
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-32">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          prj.status === 'ACTIVE'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {prj.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
