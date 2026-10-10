import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  FileCode,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ImportProfile, ExportJob } from '../types';

interface ImportsExportsViewProps {
  profiles: ImportProfile[];
  exportJobs: ExportJob[];
  onTriggerExport: (name: string, format: 'CSV' | 'XLSX' | 'ISDOC' | 'PDF', targetModule: string) => Promise<void>;
}

export const ImportsExportsView: React.FC<ImportsExportsViewProps> = ({
  profiles,
  exportJobs,
  onTriggerExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'CSV' | 'XLSX' | 'ISDOC' | 'PDF'>('XLSX');
  const [targetModule, setTargetModule] = useState('VZT_KOMPONENTY');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onTriggerExport(
        `Export_${targetModule}_${new Date().toISOString().split('T')[0]}.${selectedFormat.toLowerCase()}`,
        selectedFormat,
        targetModule
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            <span>Importy & Exporty Dat (ISDOC / XLSX / CSV)</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Synchronizace kusovníků VZT, docházkových výkazů a elektronických faktur v mezinárodních formátech
          </p>
        </div>
      </div>

      {/* Export Launcher & Import Profiles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Export Generator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <span>Generátor exportu dat</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Datová sada k exportu</label>
              <select
                value={targetModule}
                onChange={e => setTargetModule(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="VZT_KOMPONENTY">Výrobní kusovník VZT (Plochy, hmotnosti, díly)</option>
                <option value="DOCHAZKA">Výkaz docházky s GPS koordináty a hodinami</option>
                <option value="FAKTURY">Faktury a platební předpisy (ISDOC / QR)</option>
                <option value="SKLAD">Skladové zásoby a inventurní soupis</option>
                <option value="STAVEBNI_DENIK">Stavební deník s časovými razítky</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Výstupní formát</label>
              <div className="grid grid-cols-4 gap-2">
                {(['XLSX', 'CSV', 'ISDOC', 'PDF'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSelectedFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedFormat === fmt
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Formát {selectedFormat}:</span>
              </div>
              <p>
                {selectedFormat === 'ISDOC'
                  ? 'Standard pro elektronickou fakturaci a výměnu dokladů v ČR s digitálním podpisem.'
                  : selectedFormat === 'XLSX'
                  ? 'Plně formátovaný excelovský sešit s výpočetními vzorci pro m² a spotřební materiál.'
                  : selectedFormat === 'PDF'
                  ? 'Tiskový výstup vhodný k předání investorovi a stavebnímu dozoru.'
                  : 'Strukturovaný textový formát pro import do externích ERP / účetních systémů (Pohoda, Money S3).'}
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generuji export...' : `Vygenerovat a stáhnout ${selectedFormat}`}</span>
            </button>
          </div>
        </div>

        {/* Configured Import Profiles */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-emerald-400" />
            <span>Nakonfigurované importní profily</span>
          </h3>

          <div className="space-y-3">
            {profiles.map(prof => (
              <div key={prof.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200 text-xs">{prof.name}</span>
                    <span className="font-mono text-[10px] bg-slate-900 px-2 py-0.5 rounded text-cyan-400 border border-slate-800">
                      {prof.format}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">Cílový modul: {prof.targetModule}</div>
                </div>

                <button
                  onClick={() => alert(`Importní soubor pro profil "${prof.name}" byl úspěšně zpracován.`)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nahrát soubor</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Jobs History */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <span>Historie vygenerovaných exportů ({exportJobs.length})</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Soubor</th>
                <th className="py-3 px-4">Modul</th>
                <th className="py-3 px-4">Formát</th>
                <th className="py-3 px-4">Stav</th>
                <th className="py-3 px-4 text-right">Čas vygenerování</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {exportJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-200">
                    {job.name}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{job.targetModule}</td>
                  <td className="py-3 px-4 font-mono text-cyan-400 font-semibold">{job.format}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{job.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    {new Date(job.createdAt).toLocaleString('cs-CZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
