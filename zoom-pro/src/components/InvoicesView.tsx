import React, { useState } from 'react';
import {
  FileCheck,
  Plus,
  Sparkles,
  QrCode,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building,
  CreditCard,
  X,
  Clock,
} from 'lucide-react';
import { Invoice, Project, AttendanceRecord } from '../types';

interface InvoicesViewProps {
  invoices: Invoice[];
  projects: Project[];
  attendance: AttendanceRecord[];
  onGenerateFromAttendance: (projectId: string, period: string, hourlyRate: number) => Promise<void>;
  onUpdateInvoiceStatus: (id: string, status: 'VYSTAVENO' | 'ZAPLACENO' | 'PO_SPLATNOSTI' | 'STORNO') => Promise<void>;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  projects,
  attendance,
  onGenerateFromAttendance,
  onUpdateInvoiceStatus,
}) => {
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [period, setPeriod] = useState('2026-03');
  const [hourlyRate, setHourlyRate] = useState(550);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedQrInvoice, setSelectedQrInvoice] = useState<Invoice | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await onGenerateFromAttendance(selectedProjectId, period, hourlyRate);
      setShowAutoModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSpaydString = (inv: Invoice) => {
    const total = inv.amountTotal || inv.amount || 0;
    const invNum = inv.number || inv.invoiceNumber || inv.id || '1001';
    const vs = invNum.replace(/\D/g, '') || '1001';
    return `SPD*1.0*ACC:CZ6508000000192000145399*AM:${total.toFixed(2)}*CC:CZK*VS:${vs}*MSG:FAKTURA ${invNum}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <FileCheck className="w-6 h-6 text-cyan-400" />
            <span>Faktury & Automatizace z Docházky</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Automatické generování daňových dokladů z odpracovaných hodin s QR platbou SPAYD
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAutoModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generovat z docházky</span>
          </button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <span>Přehled vystavených faktur ({invoices.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Číslo faktury</th>
                <th className="py-3 px-4">Odběratel / Projekt</th>
                <th className="py-3 px-4">Vystaveno / Splatnost</th>
                <th className="py-3 px-4">Částka s DPH</th>
                <th className="py-3 px-4">Stav úhrady</th>
                <th className="py-3 px-4 text-right">Platba & Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {invoices.map(inv => {
                const total = inv.amountTotal || inv.amount;
                return (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {inv.number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{inv.clientName}</div>
                      <div className="text-slate-400 text-[11px]">{inv.projectName || '—'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      <div>Vyst.: {inv.issueDate}</div>
                      <div className="text-slate-500">Splat.: {inv.dueDate}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {total.toLocaleString('cs-CZ')} {inv.currency}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={inv.status}
                        onChange={e => onUpdateInvoiceStatus(inv.id, e.target.value as any)}
                        className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border bg-slate-950 focus:outline-none ${
                          inv.status === 'ZAPLACENO'
                            ? 'text-emerald-400 border-emerald-500/30'
                            : inv.status === 'PO_SPLATNOSTI'
                            ? 'text-rose-400 border-rose-500/30'
                            : 'text-amber-400 border-amber-500/30'
                        }`}
                      >
                        <option value="VYSTAVENO">VYSTAVENO</option>
                        <option value="ZAPLACENO">ZAPLACENO</option>
                        <option value="PO_SPLATNOSTI">PO SPLATNOSTI</option>
                        <option value="STORNO">STORNO</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedQrInvoice(inv)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                        title="Zobrazit QR Platbu"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-Generation Modal */}
      {showAutoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>Automatická fakturace z docházky</span>
              </h3>
              <button
                onClick={() => setShowAutoModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Systém sečte všechny ověřené odpracované hodiny montérů na vybrané stavbě za zvolený měsíc a vygeneruje kompletní daňový doklad.
            </p>

            <form onSubmit={handleGenerate} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stavba / Zakázka</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Zúčtovací období (měsíc)</label>
                <input
                  type="month"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sazba montáže (Kč / hod)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(parseInt(e.target.value) || 0)}
                  step="50"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
                <div className="flex justify-between">
                  <span>Odpracováno v periodě:</span>
                  <span className="font-mono font-bold">160 hodin</span>
                </div>
                <div className="flex justify-between">
                  <span>Odhad částky bez DPH:</span>
                  <span className="font-mono font-bold">{(160 * hourlyRate).toLocaleString('cs-CZ')} Kč</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAutoModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  {isGenerating ? 'Generuji...' : 'Vystavit fakturu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Platba SPAYD Modal */}
      {selectedQrInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 text-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-cyan-400 font-bold">{selectedQrInvoice.number}</span>
              <button onClick={() => setSelectedQrInvoice(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="font-bold text-base text-white">QR Platba (SPAYD standard)</h3>
            <p className="text-xs text-slate-400">Naskenujte v bankovní aplikaci pro okamžitou úhradu</p>

            {/* QR Code graphic simulator */}
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  generateSpaydString(selectedQrInvoice)
                )}`}
                alt="QR Platba"
                className="w-48 h-48 mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Částka:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {(selectedQrInvoice.amountTotal || selectedQrInvoice.amount).toLocaleString('cs-CZ')} Kč
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Účet:</span>
                <span className="font-mono text-slate-200">19-2000145399/0800</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Var. symbol:</span>
                <span className="font-mono text-slate-200">
                  {(selectedQrInvoice.number || selectedQrInvoice.invoiceNumber || selectedQrInvoice.id || '1001').replace(/\D/g, '') || '1001'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
