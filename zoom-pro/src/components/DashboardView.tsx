import React, { useState } from 'react';
import {
  Building2,
  Clock,
  FileText,
  Boxes,
  Users,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Gauge,
  BarChart3,
  DollarSign,
  Scale,
} from 'lucide-react';
import {
  User,
  Project,
  AttendanceRecord,
  Invoice,
  VztComponent,
  InventoryItem,
  DailyLog,
  MonterInvoiceClaim,
  ConsumablesSummary,
  CompanySettings,
} from '../types';
import { ProjectKpiDashboard } from './ProjectKpiDashboard';

interface DashboardViewProps {
  currentUser: User;
  projects: Project[];
  attendance: AttendanceRecord[];
  invoices: Invoice[];
  vztComponents: VztComponent[];
  inventory: InventoryItem[];
  dailyLogs: DailyLog[];
  monterClaims?: MonterInvoiceClaim[];
  consumables?: ConsumablesSummary;
  settings?: CompanySettings;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  projects,
  attendance,
  invoices,
  vztComponents,
  inventory,
  dailyLogs,
  monterClaims = [],
  consumables,
  settings,
  onNavigate,
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'overview' | 'project_kpi'>('overview');

  const isAdminOrDirector = ['SUPERADMIN', 'REDITEL', 'ADMINISTRACE', 'VEDOUCI'].includes(currentUser.role);

  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
  const todayAttendance = attendance.filter(
    a => new Date(a.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.amountTotal || inv.amount), 0);
  const paidInvoiced = invoices
    .filter(i => i.status === 'ZAPLACENO')
    .reduce((acc, inv) => acc + (inv.amountTotal || inv.amount), 0);

  const totalVztArea = vztComponents.reduce((acc, c) => acc + (c.surfaceArea || 0), 0);
  const lowStockCount = inventory.filter(i => i.quantity <= i.minQuantity).length;

  return (
    <div className="space-y-6">
      {/* Welcome & Status Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PWA VZT Pro Systém v2.0 • Online režim</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Vítejte, {currentUser.firstName} {currentUser.lastName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Firma: <span className="text-slate-200 font-semibold">VZT System s.r.o.</span> • Vaše role: <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 text-xs">{currentUser.role}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Switch to Project KPI Dashboard */}
            <button
              onClick={() => setActiveViewMode(activeViewMode === 'project_kpi' ? 'overview' : 'project_kpi')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all shadow-lg cursor-pointer ${
                activeViewMode === 'project_kpi'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white ring-2 ring-purple-400/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>{activeViewMode === 'project_kpi' ? '🏢 Zpět na Operativní přehled' : '📊 Project KPI Dashboard'}</span>
            </button>

            <button
              onClick={() => onNavigate('dochazka')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Zapsat docházku</span>
            </button>
            <button
              onClick={() => onNavigate('kalkulacka')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700/80 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>3D Kalkulátor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Tabs (Overview vs Project KPI) */}
      <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveViewMode('overview')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeViewMode === 'overview'
              ? 'bg-slate-800 text-cyan-300 shadow-md border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Operativní Přehled & Běžící Stavby</span>
        </button>

        <button
          onClick={() => setActiveViewMode('project_kpi')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeViewMode === 'project_kpi'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 shadow-md border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
          }`}
        >
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span>Project KPI Dashboard (Ziskovost, Odchylka Materiálu & Termíny)</span>
          {isAdminOrDirector && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Admin
            </span>
          )}
        </button>
      </div>

      {/* CONDITIONAL VIEW RENDERING */}
      {activeViewMode === 'project_kpi' ? (
        <ProjectKpiDashboard
          currentUser={currentUser}
          projects={projects}
          invoices={invoices}
          vztComponents={vztComponents}
          attendance={attendance}
          monterClaims={monterClaims}
          consumables={consumables}
          settings={settings}
          onNavigate={onNavigate}
        />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => onNavigate('projekty')}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktivní stavby</span>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-white">{activeProjects}</span>
                <span className="text-xs text-blue-400 font-medium flex items-center">
                  z celkem {projects.length} <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">GPS hlídání perimetru stavby</div>
            </div>

            <div
              onClick={() => onNavigate('dochazka')}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dnešní docházka</span>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-white">{todayAttendance}</span>
                <span className="text-xs text-emerald-400 font-medium flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> GPS ověřeno
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">Příchody na stavby v radiusu</div>
            </div>

            <div
              onClick={() => onNavigate('kalkulacka')}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Výroba VZT celkem</span>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-white">{Math.round(totalVztArea * 10) / 10} m²</span>
                <span className="text-xs text-cyan-400 font-medium font-mono">
                  {vztComponents.length} kusů
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">Spočtený plech + spotřební mat.</div>
            </div>

            <div
              onClick={() => onNavigate('faktury')}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fakturace & Příjmy</span>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-white">
                  {Math.round(totalInvoiced / 1000)} tis. Kč
                </span>
                <span className="text-xs text-emerald-400 font-medium font-mono">
                  {Math.round(paidInvoiced / 1000)} tis. uhrazeno
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">Včetně auto-faktur z docházky</div>
            </div>
          </div>

          {/* Quick KPI Teaser Banner for Admins */}
          {isAdminOrDirector && (
            <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">
                    Pokročilé Manažerské Metriky Staveb (Project KPI)
                  </div>
                  <div className="text-xs text-slate-400">
                    Sledování reálné ziskovosti staveb, normativních odchylek plechu/tmelů a indexu plnění harmonogramu (SPI).
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveViewMode('project_kpi')}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer shadow-md"
              >
                <span>Otevřít Project KPI Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Grid: Projects Overview & Latest Site Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Projects List */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-slate-100">Běžící stavby a projekty</h2>
                </div>
                <button
                  onClick={() => onNavigate('projekty')}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Všechny projekty</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {projects.slice(0, 3).map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => onNavigate('projekty')}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">
                          {proj.code}
                        </span>
                        <h3 className="font-semibold text-slate-200 text-sm">{proj.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{proj.address}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Klient: {proj.clientName} • Geofence: {proj.radius}m</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-300">Rozpočet</div>
                        <div className="text-sm font-mono font-bold text-emerald-400">
                          {proj.budget?.toLocaleString('cs-CZ')} Kč
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        proj.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {proj.status === 'ACTIVE' ? 'Probíhá' : 'Dokončeno'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Insights & Stock Alerts */}
            <div className="space-y-6">
              {/* Sklad Alert */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Boxes className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-slate-100">Sklad & Materiál</h3>
                  </div>
                  <button
                    onClick={() => onNavigate('sklad')}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    Detail
                  </button>
                </div>

                {lowStockCount > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2.5 mb-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>{lowStockCount} položek je pod minimálním limitem zásob!</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Všechny položky skladu mají dostatečné zásoby.</span>
                  </div>
                )}

                <div className="space-y-2">
                  {inventory.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/40">
                      <span className="text-slate-300 line-clamp-1">{item.name}</span>
                      <span className="font-mono font-semibold text-slate-100 shrink-0 ml-2">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Poslední stavební zápisy */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-bold text-slate-100">Stavební deník</h3>
                  </div>
                  <button
                    onClick={() => onNavigate('denik')}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Vše
                  </button>
                </div>

                <div className="space-y-2.5">
                  {dailyLogs.slice(0, 2).map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400 font-mono">
                        <span>{log.logDate}</span>
                        <span className="text-cyan-400">{log.projectName}</span>
                      </div>
                      <p className="text-slate-200 line-clamp-2">{log.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
