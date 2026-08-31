import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Filter,
  Printer,
  Layers,
  CheckCircle2,
  Wind,
  Droplets,
  Flame,
} from 'lucide-react';
import { Project, VztComponent, ConsumablesSummary, MediumType } from '../../types';

interface BomListViewProps {
  projects: Project[];
  components: VztComponent[];
  consumables: ConsumablesSummary;
  onDeleteComponent: (id: string) => Promise<void>;
}

export const BomListView: React.FC<BomListViewProps> = ({
  projects,
  components,
  consumables,
  onDeleteComponent,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [filterMedium, setFilterMedium] = useState<'ALL' | MediumType>('ALL');

  const filteredComponents = useMemo(() => {
    return components.filter(c => {
      const matchProj = selectedProjectId === 'ALL' || c.projectId === selectedProjectId;
      const matchMedium = filterMedium === 'ALL' || (c.medium || 'VZT') === filterMedium;
      return matchProj && matchMedium;
    });
  }, [components, selectedProjectId, filterMedium]);

  const totals = useMemo(() => {
    let area = 0;
    let weight = 0;
    let cost = 0;
    let sell = 0;

    for (const c of filteredComponents) {
      area += c.surfaceArea || 0;
      weight += (c.weight || 0) + (c.waterWeight || 0);
      cost += c.costPrice || 0;
      sell += c.sellPrice || 0;
    }

    return {
      count: filteredComponents.length,
      area: Math.round(area * 100) / 100,
      weight: Math.round(weight * 10) / 10,
      cost,
      sell,
      margin: sell - cost,
    };
  }, [filteredComponents]);

  const handleExportCSV = () => {
    if (filteredComponents.length === 0) {
      alert('V kusovníku nejsou žádné položky pro export.');
      return;
    }

    const headers = [
      'ID',
      'Medium',
      'Stavba',
      'Typ',
      'Rozměry / DN',
      'Délka (mm)',
      'Materiál',
      'Plocha (m2)',
      'Hmotnost (kg)',
      'Výrobní cena (Kč)',
      'Prodejní cena (Kč)',
      'Poznámka',
    ];

    const rows = filteredComponents.map(c => {
      const dim =
        c.medium === 'VZT'
          ? c.type === 'Kruhové'
            ? `Ø${c.diameter} mm`
            : `${c.width}×${c.height} mm`
          : `DN${c.dn || 25}`;

      return [
        c.id,
        c.medium || 'VZT',
        c.projectName || '—',
        c.type,
        dim,
        c.length,
        c.material,
        c.surfaceArea,
        c.weight + (c.waterWeight || 0),
        c.costPrice,
        c.sellPrice,
        `"${(c.note || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kusovnik-tzb-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Počet prvků</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{totals.count} ks</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ve vybraném filtru</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Celková plocha</div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">{totals.area} m²</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Plášť / izolace</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Celková hmotnost</div>
          <div className="text-2xl font-black text-slate-200 font-mono mt-1">{totals.weight} kg</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Včetně vodního média</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Výrobní náklad</div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {totals.cost.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Materiál + montáž</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg col-span-2 lg:col-span-1">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Prodejní cena celkem</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totals.sell.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-[10px] text-emerald-500 mt-0.5 font-semibold">
            Zisk: +{totals.margin.toLocaleString('cs-CZ')} Kč
          </div>
        </div>
      </div>

      {/* Consumables Summary Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Automatická bilance spotřebního materiálu pro montáž</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono">
            <span className="text-slate-400 block text-[11px]">Šrouby + matice M8:</span>
            <span className="text-lg font-black text-cyan-400">{consumables.totalScrews || totals.count * 8} ks</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono">
            <span className="text-slate-400 block text-[11px]">Těsnicí PES páska:</span>
            <span className="text-lg font-black text-cyan-400">{consumables.totalTapeMeters || Math.round(totals.area * 2.2)} m</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono">
            <span className="text-slate-400 block text-[11px]">Trhací nýty 3.2×8:</span>
            <span className="text-lg font-black text-cyan-400">{consumables.totalRivets || totals.count * 12} ks</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono">
            <span className="text-slate-400 block text-[11px]">Tmel na příruby:</span>
            <span className="text-lg font-black text-cyan-400">{consumables.totalSealant || Math.round(totals.count * 60)} ml</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Položkový kusovník vyrobených prvků TZB</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Medium */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterMedium('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMedium === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vše
              </button>
              <button
                onClick={() => setFilterMedium('VZT')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMedium === 'VZT' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>VZT</span>
              </button>
              <button
                onClick={() => setFilterMedium('TOPENI')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMedium === 'TOPENI' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Topení</span>
              </button>
              <button
                onClick={() => setFilterMedium('VODA')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterMedium === 'VODA' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Voda</span>
              </button>
            </div>

            {/* Filter Project */}
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

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all shadow"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Médium</th>
                <th className="py-3 px-3">Typ prvku</th>
                <th className="py-3 px-3">Dimenze / DN</th>
                <th className="py-3 px-3">Délka</th>
                <th className="py-3 px-3">Materiál</th>
                <th className="py-3 px-3 text-right">Plocha / Objem</th>
                <th className="py-3 px-3 text-right">Hmotnost</th>
                <th className="py-3 px-3 text-right">Prodejní cena</th>
                <th className="py-3 px-3">Poznámka / Stavba</th>
                <th className="py-3 px-3 text-center">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredComponents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Zatím nebyly přidány žádné prvky pro toto médium nebo stavbu.
                  </td>
                </tr>
              ) : (
                filteredComponents.map(comp => {
                  const m = comp.medium || 'VZT';
                  return (
                    <tr key={comp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            m === 'VZT'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                              : m === 'TOPENI'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {m === 'VZT' && <Wind className="w-3 h-3" />}
                          {m === 'TOPENI' && <Flame className="w-3 h-3" />}
                          {m === 'VODA' && <Droplets className="w-3 h-3" />}
                          <span>{m}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">{comp.type.replace('_', ' ')}</td>
                      <td className="py-3 px-3 font-mono text-cyan-300">
                        {m === 'VZT'
                          ? comp.type === 'Kruhové'
                            ? `Ø${comp.diameter} mm`
                            : `${comp.width}×${comp.height} mm`
                          : `DN ${comp.dn || 25}`}
                      </td>
                      <td className="py-3 px-3 font-mono">{comp.length} mm</td>
                      <td className="py-3 px-3 text-slate-400">{comp.material}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        {comp.surfaceArea} m²
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                        {comp.weight + (comp.waterWeight || 0)} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {comp.sellPrice.toLocaleString('cs-CZ')} Kč
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-[200px] truncate">
                        <div className="text-white font-medium truncate">{comp.projectName || '—'}</div>
                        <div className="text-[11px] text-slate-500 truncate">{comp.note}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Opravdu chcete tento prvek smazat z kusovníku?')) {
                              onDeleteComponent(comp.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Smazat díl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
