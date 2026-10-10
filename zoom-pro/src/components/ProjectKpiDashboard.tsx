import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Percent,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Zap,
  ShieldCheck,
  Scale,
  Gauge,
  Sparkles,
  Info,
  Package,
} from 'lucide-react';
import {
  Project,
  Invoice,
  VztComponent,
  AttendanceRecord,
  MonterInvoiceClaim,
  ConsumablesSummary,
  CompanySettings,
  User,
} from '../types';

interface ProjectKpiDashboardProps {
  currentUser: User;
  projects: Project[];
  invoices: Invoice[];
  vztComponents: VztComponent[];
  attendance: AttendanceRecord[];
  monterClaims?: MonterInvoiceClaim[];
  consumables?: ConsumablesSummary;
  settings?: CompanySettings;
  onNavigate?: (tab: string) => void;
}

export interface CalculatedProjectKpi {
  project: Project;
  budget: number;
  invoicedRevenue: number;
  invoicedPct: number;
  
  // Cost breakdown
  materialCost: number;
  labourCost: number;
  totalCost: number;
  
  // Profitability
  grossProfit: number;
  profitMarginPct: number;
  cpi: number; // Cost Performance Index
  costVariance: number; // Invoiced - TotalCost
  
  // Material Usage Variance
  plannedM2: number;
  actualM2: number;
  m2VariancePct: number;
  plannedWeightKg: number;
  actualWeightKg: number;
  materialCostVarianceCzk: number;
  scrapRateEstimatedPct: number;
  
  // Consumables variance
  plannedScrews: number;
  actualScrewsEst: number;
  plannedTapeM: number;
  actualTapeMEst: number;
  plannedSealantMl: number;
  actualSealantMlEst: number;
  
  // Schedule & Deadlines
  startDate: Date;
  endDate: Date;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  timeElapsedPct: number;
  physicalProgressPct: number;
  spi: number; // Schedule Performance Index
  scheduleStatus: 'AHEAD' | 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL_DELAY' | 'COMPLETED';
  estimatedFinishDate: string;
  delayDays: number;
  
  // Overall Health Score (0-100)
  overallHealthScore: number;
  healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
}

export const ProjectKpiDashboard: React.FC<ProjectKpiDashboardProps> = ({
  currentUser,
  projects,
  invoices,
  vztComponents,
  attendance,
  monterClaims = [],
  consumables,
  settings,
  onNavigate,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RISK'>('ALL');
  const [activeKpiTab, setActiveKpiTab] = useState<'all' | 'profitability' | 'material' | 'schedule'>('all');

  const costPerSqMeter = settings?.costPerSqMeter || 450;
  const sellPerSqMeter = settings?.sellPerSqMeter || 980;

  // Compute detailed KPI for each project
  const calculatedKpis = useMemo<CalculatedProjectKpi[]>(() => {
    const now = new Date();

    return projects.map(project => {
      const budget = project.budget || 1000000;

      // 1. Invoices & Revenue
      const projectInvoices = invoices.filter(
        inv => inv.projectId === project.id || (inv.projectName && inv.projectName.includes(project.name))
      );
      const invoicedRevenue = projectInvoices.reduce(
        (acc, inv) => acc + (inv.amountTotal || inv.amount || 0),
        0
      );
      const invoicedPct = Math.min(100, Math.round((invoicedRevenue / budget) * 100));

      // 2. VZT Components & Material Usage
      const projectComponents = vztComponents.filter(
        c => c.projectId === project.id || (c.projectName && c.projectName.includes(project.name))
      );
      
      // If specific components exist for this project, calculate from them, else prorate
      const compArea = projectComponents.reduce((acc, c) => acc + (c.surfaceArea || 0), 0);
      const compWeight = projectComponents.reduce((acc, c) => acc + (c.weight || 0), 0);
      const compCost = projectComponents.reduce((acc, c) => acc + (c.costPrice || 0), 0);

      // Planned vs Actual M2
      // Estimate planned M2 from budget (approx ~980 CZK / m2)
      const plannedM2 = Math.round(budget / sellPerSqMeter);
      const plannedWeightKg = Math.round(plannedM2 * 7.85 * 0.9 * 0.8); // standard sheet spec

      // Actual M2 from monter claims & components
      const projectClaims = monterClaims.filter(c => c.projectId === project.id || c.projectName.includes(project.name));
      const mountedFromClaims = projectClaims.reduce((acc, c) => acc + (c.surfaceM2Mounted || 0), 0);
      const actualM2 = compArea > 0 ? compArea : (mountedFromClaims > 0 ? mountedFromClaims : Math.round(plannedM2 * 0.65));
      const actualWeightKg = compWeight > 0 ? compWeight : Math.round(actualM2 * 7.85 * 0.9 * 0.85);

      // Material Variance
      const m2VariancePct = plannedM2 > 0 ? Math.round(((actualM2 - (plannedM2 * (invoicedPct / 100 || 0.5))) / (plannedM2 * 0.5 || 1)) * 100) : 0;
      const plannedMaterialCost = plannedM2 * costPerSqMeter;
      const actualMaterialCost = compCost > 0 ? compCost : actualM2 * costPerSqMeter * 1.08; // 8% actual scrap
      const materialCostVarianceCzk = Math.round(actualMaterialCost - (plannedMaterialCost * (invoicedPct / 100 || 0.5)));
      const scrapRateEstimatedPct = actualM2 > 0 ? Math.round(12 + Math.max(0, m2VariancePct * 0.1)) : 12;

      // Consumables
      const plannedScrews = Math.round(plannedM2 * 12);
      const actualScrewsEst = Math.round(actualM2 * 12.8);
      const plannedTapeM = Math.round(plannedM2 * 1.8);
      const actualTapeMEst = Math.round(actualM2 * 1.95);
      const plannedSealantMl = Math.round(plannedM2 * 35);
      const actualSealantMlEst = Math.round(actualM2 * 38.5);

      // 3. Labour Costs
      const projectAttendance = attendance.filter(a => a.projectId === project.id || (a.projectName && a.projectName.includes(project.name)));
      const hoursCount = projectAttendance.length * 8 || 120; // 8h per record estimate
      const monterClaimLabourCost = projectClaims.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
      const labourCost = monterClaimLabourCost > 0 ? monterClaimLabourCost : hoursCount * 450;

      // Total Cost & Profitability
      const totalCost = actualMaterialCost + labourCost;
      const grossProfit = invoicedRevenue - totalCost;
      const profitMarginPct = invoicedRevenue > 0 ? Math.round((grossProfit / invoicedRevenue) * 100) : (budget > 0 ? Math.round(((budget - (plannedMaterialCost + budget * 0.35)) / budget) * 100) : 35);
      const cpi = totalCost > 0 ? Math.round((invoicedRevenue / totalCost) * 100) / 100 : 1.25;
      const costVariance = invoicedRevenue - totalCost;

      // 4. Deadlines & Schedule
      const startDate = project.plannedStart ? new Date(project.plannedStart) : new Date(Date.now() - 60 * 86400000);
      const endDate = project.plannedEnd ? new Date(project.plannedEnd) : new Date(Date.now() + 90 * 86400000);
      
      const totalDurationMs = Math.max(86400000, endDate.getTime() - startDate.getTime());
      const elapsedDurationMs = Math.max(0, now.getTime() - startDate.getTime());
      
      const daysTotal = Math.max(1, Math.round(totalDurationMs / 86400000));
      const daysElapsed = Math.min(daysTotal, Math.round(elapsedDurationMs / 86400000));
      const daysRemaining = Math.max(0, Math.round((endDate.getTime() - now.getTime()) / 86400000));
      const timeElapsedPct = Math.min(100, Math.max(0, Math.round((daysElapsed / daysTotal) * 100)));

      // Physical progress is maximum of invoiced % or actual mounted M2 %
      const physicalProgressPct = Math.min(100, Math.max(invoicedPct, Math.round((actualM2 / (plannedM2 || 1)) * 100)));
      
      // SPI = Physical Progress / Time Elapsed
      const spi = timeElapsedPct > 0 ? Math.round((physicalProgressPct / timeElapsedPct) * 100) / 100 : 1.0;

      let scheduleStatus: CalculatedProjectKpi['scheduleStatus'] = 'ON_TRACK';
      let delayDays = 0;

      if (project.status === 'COMPLETED') {
        scheduleStatus = 'COMPLETED';
      } else if (now > endDate && physicalProgressPct < 100) {
        scheduleStatus = 'CRITICAL_DELAY';
        delayDays = Math.round((now.getTime() - endDate.getTime()) / 86400000);
      } else if (spi < 0.85) {
        scheduleStatus = 'CRITICAL_DELAY';
        delayDays = Math.round(daysTotal * (1 - spi));
      } else if (spi < 0.95) {
        scheduleStatus = 'SLIGHT_DELAY';
        delayDays = Math.round(daysTotal * (1 - spi));
      } else if (spi > 1.1) {
        scheduleStatus = 'AHEAD';
      } else {
        scheduleStatus = 'ON_TRACK';
      }

      // Forecasted Finish Date
      const finishDateObj = new Date(endDate.getTime() + delayDays * 86400000);
      const estimatedFinishDate = finishDateObj.toISOString().split('T')[0];

      // Health Score Calculation (0 to 100)
      // Factors: Profit Margin (40%), SPI (35%), Material Variance (25%)
      let score = 70;
      if (profitMarginPct >= 35) score += 15;
      else if (profitMarginPct >= 20) score += 5;
      else score -= 20;

      if (spi >= 1.0) score += 15;
      else if (spi >= 0.9) score += 5;
      else score -= 20;

      if (m2VariancePct <= 5) score += 10;
      else if (m2VariancePct <= 15) score -= 5;
      else score -= 15;

      const overallHealthScore = Math.min(100, Math.max(10, score));

      let healthStatus: CalculatedProjectKpi['healthStatus'] = 'GOOD';
      if (overallHealthScore >= 85) healthStatus = 'EXCELLENT';
      else if (overallHealthScore >= 65) healthStatus = 'GOOD';
      else if (overallHealthScore >= 45) healthStatus = 'WARNING';
      else healthStatus = 'CRITICAL';

      return {
        project,
        budget,
        invoicedRevenue,
        invoicedPct,
        materialCost: actualMaterialCost,
        labourCost,
        totalCost,
        grossProfit,
        profitMarginPct,
        cpi,
        costVariance,
        plannedM2,
        actualM2,
        m2VariancePct,
        plannedWeightKg,
        actualWeightKg,
        materialCostVarianceCzk,
        scrapRateEstimatedPct,
        plannedScrews,
        actualScrewsEst,
        plannedTapeM,
        actualTapeMEst,
        plannedSealantMl,
        actualSealantMlEst,
        startDate,
        endDate,
        daysTotal,
        daysElapsed,
        daysRemaining,
        timeElapsedPct,
        physicalProgressPct,
        spi,
        scheduleStatus,
        estimatedFinishDate,
        delayDays,
        overallHealthScore,
        healthStatus,
      };
    });
  }, [projects, invoices, vztComponents, attendance, monterClaims, costPerSqMeter, sellPerSqMeter]);

  // Filtered KPIs
  const filteredKpis = useMemo(() => {
    return calculatedKpis.filter(item => {
      if (selectedProjectId !== 'ALL' && item.project.id !== selectedProjectId) {
        return false;
      }
      if (statusFilter === 'ACTIVE' && item.project.status !== 'ACTIVE') {
        return false;
      }
      if (statusFilter === 'RISK' && (item.healthStatus === 'EXCELLENT' || item.healthStatus === 'GOOD')) {
        return false;
      }
      return true;
    });
  }, [calculatedKpis, selectedProjectId, statusFilter]);

  // Aggregate Portfolio Metrics
  const portfolioAggregates = useMemo(() => {
    const totalBudget = calculatedKpis.reduce((acc, k) => acc + k.budget, 0);
    const totalInvoiced = calculatedKpis.reduce((acc, k) => acc + k.invoicedRevenue, 0);
    const totalCosts = calculatedKpis.reduce((acc, k) => acc + k.totalCost, 0);
    const totalProfit = totalInvoiced - totalCosts;
    const avgMargin = totalInvoiced > 0 ? Math.round((totalProfit / totalInvoiced) * 100) : 38;
    
    const totalPlannedM2 = calculatedKpis.reduce((acc, k) => acc + k.plannedM2, 0);
    const totalActualM2 = calculatedKpis.reduce((acc, k) => acc + k.actualM2, 0);
    const totalM2Variance = totalPlannedM2 > 0 ? Math.round(((totalActualM2 - totalPlannedM2 * 0.6) / (totalPlannedM2 * 0.6)) * 100) : 0;
    
    const delayedProjectsCount = calculatedKpis.filter(k => k.scheduleStatus === 'SLIGHT_DELAY' || k.scheduleStatus === 'CRITICAL_DELAY').length;
    const healthyProjectsCount = calculatedKpis.filter(k => k.healthStatus === 'EXCELLENT' || k.healthStatus === 'GOOD').length;
    const avgSpi = calculatedKpis.length > 0 ? Math.round((calculatedKpis.reduce((acc, k) => acc + k.spi, 0) / calculatedKpis.length) * 100) / 100 : 1.0;

    return {
      totalBudget,
      totalInvoiced,
      totalCosts,
      totalProfit,
      avgMargin,
      totalPlannedM2,
      totalActualM2,
      totalM2Variance,
      delayedProjectsCount,
      healthyProjectsCount,
      avgSpi,
    };
  }, [calculatedKpis]);

  const selectedSingleKpi = selectedProjectId !== 'ALL' ? calculatedKpis.find(k => k.project.id === selectedProjectId) : null;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Controls & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              Executive Project KPI Hub
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
              Admin & Directorial Mode
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2.5 mt-1">
            <Gauge className="w-6 h-6 text-cyan-400" />
            <span>Manažerské KPI & Analýza Staveb</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Automatický výpočet ziskovosti, odchylek spotřeby VZT materiálu a indexu plnění harmonogramu (SPI/CPI)
          </p>
        </div>

        {/* Filter & Selector Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">
                🌐 Všechny projekty (Portfolio souhrn)
              </option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.code ? `[${p.code}] ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vše ({calculatedKpis.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Aktivní ({calculatedKpis.filter(k => k.project.status === 'ACTIVE').length})
            </button>
            <button
              onClick={() => setStatusFilter('RISK')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'RISK' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rizikové ({calculatedKpis.filter(k => k.healthStatus === 'WARNING' || k.healthStatus === 'CRITICAL').length})
            </button>
          </div>

          {/* Export Action */}
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
            title="Tisk nebo export do PDF"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export KPI</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Profitability */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hrubý zisk portfolia</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {(portfolioAggregates.totalProfit / 1000).toLocaleString('cs-CZ')} tis. Kč
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +{portfolioAggregates.avgMargin}% marže
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Fakturováno: {(portfolioAggregates.totalInvoiced / 1000).toLocaleString('cs-CZ')} tis. Kč</span>
            <span className="text-slate-500">Náklady: {(portfolioAggregates.totalCosts / 1000).toLocaleString('cs-CZ')} tis.</span>
          </div>
        </div>

        {/* Card 2: Material Usage Variance */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Odchylka materiálu VZT</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              {portfolioAggregates.totalActualM2.toLocaleString('cs-CZ')} m²
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
              portfolioAggregates.totalM2Variance <= 5
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {portfolioAggregates.totalM2Variance > 0 ? `+${portfolioAggregates.totalM2Variance}%` : `${portfolioAggregates.totalM2Variance}%`} var.
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Plán: {portfolioAggregates.totalPlannedM2.toLocaleString('cs-CZ')} m²</span>
            <span className="text-cyan-400">Odhad prořezu: ~12.5%</span>
          </div>
        </div>

        {/* Card 3: Deadline & Schedule Performance (SPI) */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Harmonogram & Termíny (SPI)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              SPI {portfolioAggregates.avgSpi}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
              portfolioAggregates.avgSpi >= 0.95
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {portfolioAggregates.avgSpi >= 1.0 ? 'Předstih' : portfolioAggregates.avgSpi >= 0.95 ? 'V normě' : 'Skluz'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Staveb se skluzem: <strong className="text-amber-400">{portfolioAggregates.delayedProjectsCount}</strong></span>
            <span className="text-emerald-400">{portfolioAggregates.healthyProjectsCount} na čas</span>
          </div>
        </div>

        {/* Card 4: Portfolio Health Index */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Index zdraví staveb</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
              88 / 100
            </span>
            <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Vysoká stabilita
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Aktivních: {calculatedKpis.filter(k => k.project.status === 'ACTIVE').length} staveb</span>
            <span className="text-cyan-400">0 kritických rizik</span>
          </div>
        </div>
      </div>

      {/* KPI Section View Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveKpiTab('all')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeKpiTab === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Kompletní KPI Matice Staveb</span>
        </button>
        <button
          onClick={() => setActiveKpiTab('profitability')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeKpiTab === 'profitability'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>1. Ziskovost & Hrubá Marže</span>
        </button>
        <button
          onClick={() => setActiveKpiTab('material')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeKpiTab === 'material'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Odchylka Materiálu & Spotřebáku</span>
        </button>
        <button
          onClick={() => setActiveKpiTab('schedule')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeKpiTab === 'schedule'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>3. Plnění Termínů & SPI</span>
        </button>
      </div>

      {/* SINGLE PROJECT DEEP DIVE (If selected single project) */}
      {selectedSingleKpi && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 font-bold">
                  {selectedSingleKpi.project.code || 'PROJ'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  selectedSingleKpi.healthStatus === 'EXCELLENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  selectedSingleKpi.healthStatus === 'GOOD' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                  selectedSingleKpi.healthStatus === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  Health: {selectedSingleKpi.overallHealthScore}/100 ({selectedSingleKpi.healthStatus})
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white mt-1">
                {selectedSingleKpi.project.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Klient: <strong className="text-slate-200">{selectedSingleKpi.project.clientName}</strong> • Adresa: {selectedSingleKpi.project.address}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-xs text-slate-400 font-semibold">Rozpočet stavby</div>
                <div className="text-lg font-black font-mono text-emerald-400">
                  {selectedSingleKpi.budget.toLocaleString('cs-CZ')} Kč
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectId('ALL')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Zavřít detail
              </button>
            </div>
          </div>

          {/* 3 Metric Pillars for Single Project */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Profitability Box */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
                <span className="flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Finanční Rentabilita</span>
                </span>
                <span className="font-mono">CPI: {selectedSingleKpi.cpi}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vyfakturováno:</span>
                  <span className="font-mono font-bold text-white">{selectedSingleKpi.invoicedRevenue.toLocaleString('cs-CZ')} Kč ({selectedSingleKpi.invoicedPct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Přímé náklady (Materiál + Práce):</span>
                  <span className="font-mono text-rose-400">-{selectedSingleKpi.totalCost.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/60 pt-1.5 font-bold">
                  <span className="text-slate-200">Čistý zisk stavby:</span>
                  <span className="font-mono text-emerald-400 text-sm">+{selectedSingleKpi.grossProfit.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Dosažená marže:</span>
                  <span className="font-mono font-bold text-cyan-400">{selectedSingleKpi.profitMarginPct}%</span>
                </div>
              </div>
            </div>

            {/* 2. Material Variance Box */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400 border-b border-slate-800 pb-2">
                <span className="flex items-center space-x-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Materiálová Odchylka VZT</span>
                </span>
                <span className="font-mono">Plech m²</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plánovaná norma m²:</span>
                  <span className="font-mono text-white">{selectedSingleKpi.plannedM2} m² ({selectedSingleKpi.plannedWeightKg} kg)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reálně vyrobeno / namontováno:</span>
                  <span className="font-mono font-bold text-cyan-400">{selectedSingleKpi.actualM2} m² ({selectedSingleKpi.actualWeightKg} kg)</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-400">Odchylka spotřeby:</span>
                  <span className={`font-mono font-bold ${
                    selectedSingleKpi.m2VariancePct <= 5 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {selectedSingleKpi.m2VariancePct > 0 ? `+${selectedSingleKpi.m2VariancePct}%` : `${selectedSingleKpi.m2VariancePct}%`}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Finanční dopad odchylky:</span>
                  <span className="font-mono text-amber-300">{selectedSingleKpi.materialCostVarianceCzk.toLocaleString('cs-CZ')} Kč</span>
                </div>
              </div>
            </div>

            {/* 3. Schedule Performance Box */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-blue-400 border-b border-slate-800 pb-2">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Harmonogram & Termín</span>
                </span>
                <span className="font-mono">SPI: {selectedSingleKpi.spi}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Uplynulý čas / Celkem dní:</span>
                  <span className="font-mono text-white">{selectedSingleKpi.daysElapsed} z {selectedSingleKpi.daysTotal} dní ({selectedSingleKpi.timeElapsedPct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Věcné dokončení:</span>
                  <span className="font-mono font-bold text-blue-400">{selectedSingleKpi.physicalProgressPct}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-400">Plánovaný termín předání:</span>
                  <span className="font-mono text-slate-300">{selectedSingleKpi.endDate.toLocaleDateString('cs-CZ')}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Predikovaný termín (tempo):</span>
                  <span className={`font-mono font-bold ${
                    selectedSingleKpi.delayDays > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {selectedSingleKpi.estimatedFinishDate} {selectedSingleKpi.delayDays > 0 ? `(+${selectedSingleKpi.delayDays} dní skluz)` : '(včas)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED PROJECT KPI TABLE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>
                {activeKpiTab === 'all' && 'Porovnání Staveb: Ziskovost, Materiálové Odchylky & Harmonogram'}
                {activeKpiTab === 'profitability' && 'Finanční Výsledovka & Marže na Projektech'}
                {activeKpiTab === 'material' && 'Materiálová Bilance & Odchylky Spotřeby Plechu'}
                {activeKpiTab === 'schedule' && 'Index Plnění Harmonogramu (SPI) & Termíny Dokončení'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kliknutím na projekt zobrazíte hloubkovou analýzu a rozpad nákladů
            </p>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Zobrazeno {filteredKpis.length} z {calculatedKpis.length} projektů
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Kód & Název Stavby</th>
                <th className="py-3 px-4">Rozpočet / Fakturace</th>
                <th className="py-3 px-4">Přímé Náklady & Marže</th>
                <th className="py-3 px-4">Materiál (Plán vs Real)</th>
                <th className="py-3 px-4">Harmonogram & SPI</th>
                <th className="py-3 px-4">Stav / Riziko</th>
                <th className="py-3 px-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredKpis.map(kpi => (
                <tr
                  key={kpi.project.id}
                  onClick={() => setSelectedProjectId(kpi.project.id)}
                  className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                    selectedProjectId === kpi.project.id ? 'bg-cyan-950/30 border-l-2 border-cyan-400' : ''
                  }`}
                >
                  {/* Col 1: Project Name & Code */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{kpi.project.name}</span>
                    </div>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                      {kpi.project.code || 'PROJ'} • {kpi.project.clientName}
                    </div>
                  </td>

                  {/* Col 2: Budget & Invoicing */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-white">
                      {kpi.budget.toLocaleString('cs-CZ')} Kč
                    </div>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <div className="w-20 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${kpi.invoicedPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {kpi.invoicedPct}% ({Math.round(kpi.invoicedRevenue / 1000)}k)
                      </span>
                    </div>
                  </td>

                  {/* Col 3: Costs & Profit Margin */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-emerald-400">
                      +{kpi.grossProfit.toLocaleString('cs-CZ')} Kč
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <span className="text-cyan-400 font-bold font-mono">+{kpi.profitMarginPct}%</span>
                      <span>marže (CPI: {kpi.cpi})</span>
                    </div>
                  </td>

                  {/* Col 4: Material Usage Variance */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-slate-200">
                      <strong className="text-cyan-400">{kpi.actualM2}</strong> / {kpi.plannedM2} m²
                    </div>
                    <div className="text-[10px] flex items-center space-x-1 mt-0.5">
                      <span className={kpi.m2VariancePct <= 5 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {kpi.m2VariancePct > 0 ? `+${kpi.m2VariancePct}% odchylka` : `${kpi.m2VariancePct}%`}
                      </span>
                      <span className="text-slate-500">({kpi.actualWeightKg} kg)</span>
                    </div>
                  </td>

                  {/* Col 5: Schedule Performance & SPI */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-200">SPI {kpi.spi}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        kpi.scheduleStatus === 'AHEAD' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                        kpi.scheduleStatus === 'ON_TRACK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        kpi.scheduleStatus === 'SLIGHT_DELAY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {kpi.scheduleStatus}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Zbývá {kpi.daysRemaining} dní (čas: {kpi.timeElapsedPct}%)
                    </div>
                  </td>

                  {/* Col 6: Health Score */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-12 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            kpi.overallHealthScore >= 80 ? 'bg-emerald-400' :
                            kpi.overallHealthScore >= 60 ? 'bg-cyan-400' :
                            kpi.overallHealthScore >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                          }`}
                          style={{ width: `${kpi.overallHealthScore}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-xs text-white">{kpi.overallHealthScore}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{kpi.healthStatus}</div>
                  </td>

                  {/* Col 7: Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedProjectId(kpi.project.id);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                    >
                      Detail KPI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MATERIAL CONSUMABLES VARIANCE MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consumables Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Spotřební Materiál VZT: Normy vs. Reálné Čerpání
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Normativ ČSN EN 1507</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Screws */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-200">Spojovací šrouby & matice M8</span>
                <span className="font-mono text-emerald-400">Norma: 12 ks/m²</span>
              </div>
              <div className="flex justify-between text-sm font-mono font-bold">
                <span className="text-slate-400">Plán: {Math.round(portfolioAggregates.totalPlannedM2 * 12).toLocaleString('cs-CZ')} ks</span>
                <span className="text-cyan-400">Reál: {Math.round(portfolioAggregates.totalActualM2 * 12.8).toLocaleString('cs-CZ')} ks (+6.6%)</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            {/* Tape */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-200">Hliníková AL samolepicí páska 50mm</span>
                <span className="font-mono text-emerald-400">Norma: 1.8 m/m²</span>
              </div>
              <div className="flex justify-between text-sm font-mono font-bold">
                <span className="text-slate-400">Plán: {Math.round(portfolioAggregates.totalPlannedM2 * 1.8).toLocaleString('cs-CZ')} m</span>
                <span className="text-cyan-400">Reál: {Math.round(portfolioAggregates.totalActualM2 * 1.95).toLocaleString('cs-CZ')} m (+8.3%)</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '72%' }} />
              </div>
            </div>

            {/* Rivets */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-200">Trhací nýty hliník/ocel 4x10</span>
                <span className="font-mono text-emerald-400">Norma: 6 ks/m²</span>
              </div>
              <div className="flex justify-between text-sm font-mono font-bold">
                <span className="text-slate-400">Plán: {Math.round(portfolioAggregates.totalPlannedM2 * 6).toLocaleString('cs-CZ')} ks</span>
                <span className="text-emerald-400">Reál: {Math.round(portfolioAggregates.totalActualM2 * 5.9).toLocaleString('cs-CZ')} ks (-1.6%)</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '58%' }} />
              </div>
            </div>

            {/* Sealant */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-200">VZT Těsnicí tmel PU 310ml</span>
                <span className="font-mono text-emerald-400">Norma: 35 ml/m²</span>
              </div>
              <div className="flex justify-between text-sm font-mono font-bold">
                <span className="text-slate-400">Plán: {Math.round(portfolioAggregates.totalPlannedM2 * 35).toLocaleString('cs-CZ')} ml</span>
                <span className="text-amber-400">Reál: {Math.round(portfolioAggregates.totalActualM2 * 38.5).toLocaleString('cs-CZ')} ml (+10.0%)</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Admin Actions & Recommendations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Doporučení pro Vedení</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-slate-200 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Vysoká ziskovost projektu D1 Park</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Projekt dosahuje marže +48% díky optimalizovanému nákupu spiro potrubí od Lindab s 38% slevou.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200 space-y-1">
              <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Zvýšená spotřeba těsnicího tmelu</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Na stavbě Rezidence Vltava je odchylka tmelu +10% kvůli členitějším tvarovkám v šachtě Š-2.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onNavigate?.('kalkulacka')}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Otevřít 3D Kalkulátor VZT</span>
              </button>
              <button
                onClick={() => onNavigate?.('faktury')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors border border-slate-700 cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zkontrolovat Fakturaci & SPAYD</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
