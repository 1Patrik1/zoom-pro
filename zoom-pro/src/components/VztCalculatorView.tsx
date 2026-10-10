import React, { useState } from 'react';
import {
  Calculator,
  Wind,
  Droplets,
  Flame,
  FileSpreadsheet,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Project,
  VztComponent,
  ConsumablesSummary,
} from '../types';
import { VztModuleView } from './calculator/VztModuleView';
import { HeatingModuleView } from './calculator/HeatingModuleView';
import { WaterModuleView } from './calculator/WaterModuleView';
import { BomListView } from './calculator/BomListView';
import { CalculationTrendsView } from './calculator/CalculationTrendsView';

interface VztCalculatorViewProps {
  projects: Project[];
  components: VztComponent[];
  consumables: ConsumablesSummary;
  costPerSqMeter: number;
  sellPerSqMeter: number;
  onAddComponent: (comp: Omit<VztComponent, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteComponent: (id: string) => Promise<void>;
}

export type CalculatorTab = 'VZT' | 'TOPENI' | 'VODA' | 'BOM' | 'TRENDS';

export const VztCalculatorView: React.FC<VztCalculatorViewProps> = ({
  projects,
  components,
  consumables,
  costPerSqMeter,
  sellPerSqMeter,
  onAddComponent,
  onDeleteComponent,
}) => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('VZT');

  // Count items per medium
  const vztCount = components.filter(c => (c.medium || 'VZT') === 'VZT').length;
  const topeniCount = components.filter(c => c.medium === 'TOPENI').length;
  const vodaCount = components.filter(c => c.medium === 'VODA').length;

  return (
    <div id="vzt-calculator-container" className="space-y-6">
      {/* Top Header & Tabbed Navigation Interface */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Calculator className="w-7 h-7" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  3D TZB & HVAC Multi-Kalkulátor
                </h2>
                <span className="hidden sm:inline-flex items-center space-x-1 text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-700/60 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  <span>ČSN EN 1507 • ČSN 75 5455 • ČSN EN 12828</span>
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Specializované výpočtové moduly pro Vzduchotechniku, Vytápění (ÚT) a Rozvody vody (ZTI) s 3D vizualizací a grafickými trendy ztrát
              </p>
            </div>
          </div>
        </div>

        {/* Tabbed Interface for Switching between Modules: VZT, Topení, Voda, BOM & Trends */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-slate-800/80 mt-5 pt-4">
          {/* TAB 1: VZT */}
          <button
            id="tab-vzt-module"
            type="button"
            onClick={() => setActiveTab('VZT')}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              activeTab === 'VZT'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10 font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className={`p-1.5 rounded-lg ${activeTab === 'VZT' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-cyan-400'}`}>
                <Wind className="w-4 h-4" />
              </span>
              <div className="text-left">
                <div className="text-xs font-bold">💨 1. VZT</div>
                <div className="text-[10px] text-slate-500 font-normal">Spiro & 4hranné</div>
              </div>
            </div>
            {vztCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                {vztCount}
              </span>
            )}
          </button>

          {/* TAB 2: TOPENÍ */}
          <button
            id="tab-topeni-module"
            type="button"
            onClick={() => setActiveTab('TOPENI')}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              activeTab === 'TOPENI'
                ? 'bg-gradient-to-r from-red-500/20 to-amber-500/10 border-red-500 text-white shadow-lg shadow-red-500/10 font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className={`p-1.5 rounded-lg ${activeTab === 'TOPENI' ? 'bg-red-500 text-white' : 'bg-slate-800 text-red-400'}`}>
                <Flame className="w-4 h-4" />
              </span>
              <div className="text-left">
                <div className="text-xs font-bold">🔥 2. Topení</div>
                <div className="text-[10px] text-slate-500 font-normal">Spády & čerpadla</div>
              </div>
            </div>
            {topeniCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                {topeniCount}
              </span>
            )}
          </button>

          {/* TAB 3: VODA */}
          <button
            id="tab-voda-module"
            type="button"
            onClick={() => setActiveTab('VODA')}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              activeTab === 'VODA'
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/10 border-blue-500 text-white shadow-lg shadow-blue-500/10 font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className={`p-1.5 rounded-lg ${activeTab === 'VODA' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-blue-400'}`}>
                <Droplets className="w-4 h-4" />
              </span>
              <div className="text-left">
                <div className="text-xs font-bold">💧 3. Voda</div>
                <div className="text-[10px] text-slate-500 font-normal">ČSN 75 5455</div>
              </div>
            </div>
            {vodaCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                {vodaCount}
              </span>
            )}
          </button>

          {/* TAB 4: KUSOVNÍK */}
          <button
            id="tab-bom-module"
            type="button"
            onClick={() => setActiveTab('BOM')}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              activeTab === 'BOM'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10 font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className={`p-1.5 rounded-lg ${activeTab === 'BOM' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-emerald-400'}`}>
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div className="text-left">
                <div className="text-xs font-bold">📋 4. Kusovník</div>
                <div className="text-[10px] text-slate-500 font-normal">BOM ({components.length})</div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {components.length}
            </span>
          </button>

          {/* TAB 5: TRENDY ZTRÁT */}
          <button
            id="tab-trends-module"
            type="button"
            onClick={() => setActiveTab('TRENDS')}
            className={`col-span-2 sm:col-span-1 flex items-center justify-between p-3 rounded-xl border transition-all ${
              activeTab === 'TRENDS'
                ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/10 border-purple-500 text-white shadow-lg shadow-purple-500/10 font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className={`p-1.5 rounded-lg ${activeTab === 'TRENDS' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-purple-400'}`}>
                <TrendingUp className="w-4 h-4" />
              </span>
              <div className="text-left">
                <div className="text-xs font-bold">📈 5. Trendy ztrát</div>
                <div className="text-[10px] text-slate-500 font-normal">Recharts grafy Δp</div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              Δp
            </span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE MODULE */}
      {activeTab === 'VZT' && (
        <div id="module-vzt-content" className="space-y-6">
          <VztModuleView
            projects={projects}
            costPerSqMeter={costPerSqMeter}
            sellPerSqMeter={sellPerSqMeter}
            onAddComponent={onAddComponent}
          />
          {/* Also include the trends summary overview below the active module for convenience */}
          <CalculationTrendsView
            components={components}
            projects={projects}
          />
        </div>
      )}

      {activeTab === 'TOPENI' && (
        <div id="module-topeni-content" className="space-y-6">
          <HeatingModuleView
            projects={projects}
            costPerSqMeter={costPerSqMeter}
            sellPerSqMeter={sellPerSqMeter}
            onAddComponent={onAddComponent}
          />
          <CalculationTrendsView
            components={components}
            projects={projects}
          />
        </div>
      )}

      {activeTab === 'VODA' && (
        <div id="module-voda-content" className="space-y-6">
          <WaterModuleView
            projects={projects}
            costPerSqMeter={costPerSqMeter}
            sellPerSqMeter={sellPerSqMeter}
            onAddComponent={onAddComponent}
          />
          <CalculationTrendsView
            components={components}
            projects={projects}
          />
        </div>
      )}

      {activeTab === 'BOM' && (
        <div id="module-bom-content">
          <BomListView
            projects={projects}
            components={components}
            consumables={consumables}
            onDeleteComponent={onDeleteComponent}
          />
        </div>
      )}

      {activeTab === 'TRENDS' && (
        <div id="module-trends-content">
          <CalculationTrendsView
            components={components}
            projects={projects}
          />
        </div>
      )}
    </div>
  );
};
