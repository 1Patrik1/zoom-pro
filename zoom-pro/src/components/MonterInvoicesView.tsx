import React, { useState } from 'react';
import {
  Receipt,
  CheckCircle2,
  Clock,
  User,
  Building,
  DollarSign,
  Calendar,
  Layers,
  FileCheck,
  Plus,
  ArrowRight,
  ShieldCheck,
  Printer,
  QrCode,
  Download,
  Share2,
  AlertCircle,
  FileSpreadsheet,
  Banknote,
  Send,
  Eye,
} from 'lucide-react';
import { MonterInvoiceClaim } from '../types';

interface MonterInvoicesViewProps {
  claims: MonterInvoiceClaim[];
  onAddClaim: (claim: Omit<MonterInvoiceClaim, 'id' | 'createdAt'>) => void;
  onApproveClaim: (id: string) => void;
}

export const MonterInvoicesView: React.FC<MonterInvoicesViewProps> = ({
  claims,
  onAddClaim,
  onApproveClaim,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClaimForDetail, setSelectedClaimForDetail] = useState<MonterInvoiceClaim | null>(null);
  
  // Form State
  const [monterName, setMonterName] = useState('Martin Dvořák (Montér I.)');
  const [monterIco, setMonterIco] = useState('87654321');
  const [monterBankAccount, setMonterBankAccount] = useState('123456789/0800');
  const [projectName, setProjectName] = useState('Logistické Centrum D1 Park');
  const [period, setPeriod] = useState('02/2026');
  const [hoursWorked, setHoursWorked] = useState(168);
  const [surfaceM2, setSurfaceM2] = useState(420);
  const [linearMeters, setLinearMeters] = useState(280);
  const [hourlyRate, setHourlyRate] = useState(380);
  const [pieceRateM2, setPieceRateM2] = useState(65);
  const [bonusAmount, setBonusAmount] = useState(2500); // Quality & Safety bonus
  const [claimNote, setClaimNote] = useState('Dokončení páteřních VZT tras na 2.NP v termínu.');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const hourlyClaim = hoursWorked * hourlyRate;
    const pieceClaim = surfaceM2 * pieceRateM2;
    const total = hourlyClaim + pieceClaim + bonusAmount;

    onAddClaim({
      monterId: '00000000-0000-4000-8000-000000000030',
      monterName,
      projectId: 'proj-001',
      projectName,
      period,
      hoursWorked,
      surfaceM2Mounted: surfaceM2,
      linearMetersMounted: linearMeters,
      hourlyClaimAmount: hourlyClaim,
      pieceRateClaimAmount: pieceClaim,
      totalAmount: total,
      status: 'PENDING_APPROVAL',
    });

    setShowAddModal(false);
  };

  const totalPendingAmount = claims
    .filter(c => c.status === 'PENDING_APPROVAL')
    .reduce((acc, c) => acc + c.totalAmount, 0);

  const totalApprovedAmount = claims
    .filter(c => c.status === 'APPROVED' || c.status === 'INVOICE_ISSUED')
    .reduce((acc, c) => acc + c.totalAmount, 0);

  const totalHours = claims.reduce((acc, c) => acc + c.hoursWorked, 0);
  const totalM2 = claims.reduce((acc, c) => acc + c.surfaceM2Mounted, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              Subcontractor & Labour Settlement
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1">
            <Receipt className="w-6 h-6 text-emerald-400" />
            <span>Výkazy & Faktury pro Montéry</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Automatické generování interních faktur montérů, hodinové sazby z GPS docházky, úkolové odměny za m² a SPAYD QR platby
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Vystavit montérskou fakturu</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Čeká na schválení</div>
          <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
            {totalPendingAmount.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {claims.filter(c => c.status === 'PENDING_APPROVAL').length} výkazů k autorizaci
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Schváleno k vyplacení</div>
          <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {totalApprovedAmount.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Export do banky & QR platba</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Celkem odpracováno</div>
          <div className="text-2xl font-black text-cyan-400 mt-2 font-mono">
            {totalHours.toLocaleString('cs-CZ')} hod
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ověřeno přes GPS Geofence</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase">Namontováno VZT</div>
          <div className="text-2xl font-black text-teal-400 mt-2 font-mono">
            {totalM2.toLocaleString('cs-CZ')} m²
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Dle položek stavebního deníku</div>
        </div>
      </div>

      {/* Claims List Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Přehled montérských faktur a nároků</span>
          </h3>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
            Celkem: {claims.length} položek
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Montér / Četa</th>
                <th className="py-3 px-4">Stavba & Období</th>
                <th className="py-3 px-4">Odpracováno</th>
                <th className="py-3 px-4">Namontováno</th>
                <th className="py-3 px-4">Částka k výplatě</th>
                <th className="py-3 px-4">Stav faktury</th>
                <th className="py-3 px-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {claims.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                      <User className="w-4 h-4 text-cyan-400" />
                      <span>{c.monterName}</span>
                    </div>
                    {c.approvedByName && (
                      <div className="text-[10px] text-slate-500 mt-0.5">Schválil: {c.approvedByName}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-300">{c.projectName}</div>
                    <div className="text-[11px] font-mono text-cyan-400 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Období: {c.period}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div>{c.hoursWorked} hod</div>
                    <div className="text-[10px] text-slate-500">{c.hourlyClaimAmount.toLocaleString('cs-CZ')} Kč (hodinová)</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div className="text-emerald-400 font-bold">{c.surfaceM2Mounted} m²</div>
                    <div className="text-[10px] text-slate-500">{c.linearMetersMounted} bm potrubí</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-sm text-white">
                    {c.totalAmount.toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'APPROVED' || c.status === 'INVOICE_ISSUED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClaimForDetail(c)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors inline-flex items-center"
                      title="Zobrazit fakturu s QR kódem"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {c.status === 'PENDING_APPROVAL' ? (
                      <button
                        onClick={() => onApproveClaim(c.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-xs font-bold rounded-lg shadow hover:from-emerald-400 transition-all inline-flex items-center space-x-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Schválit</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-mono inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Vyplaceno</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL INVOICE MODAL (WITH QR PAYMENT) */}
      {selectedClaimForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                  FAKTURA MONTÉRA / DAŇOVÝ DOKLAD
                </span>
                <h3 className="text-xl font-black text-slate-950 mt-1">
                  Číslo: MF-{selectedClaimForDetail.period.replace('/', '')}-{selectedClaimForDetail.id.substring(0, 4)}
                </h3>
                <p className="text-xs text-slate-600">
                  Vyúčtování montážních prací vzduchotechniky a TZB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaimForDetail(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Contractor & Client Info */}
            <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-4 rounded-xl bg-slate-50">
              <div>
                <strong className="text-slate-900 block mb-1">DODAVATEL (Montér / OSVČ):</strong>
                <p className="font-bold text-sm text-slate-950">{selectedClaimForDetail.monterName}</p>
                <p>IČO: 87654321</p>
                <p>Bankovní účet: 123456789/0800</p>
              </div>
              <div>
                <strong className="text-slate-900 block mb-1">ODBĚRATEL:</strong>
                <p className="font-bold text-sm text-slate-950">ZOOM-PRO VZT s.r.o.</p>
                <p>IČO: 12345678 | DIČ: CZ12345678</p>
                <p>Stavba: {selectedClaimForDetail.projectName}</p>
              </div>
            </div>

            {/* Items Breakdown */}
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold">
                  <th className="py-2 px-2">Položka</th>
                  <th className="py-2 px-2">Množství</th>
                  <th className="py-2 px-2">Sazba</th>
                  <th className="py-2 px-2 text-right">Celkem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5 px-2">Montážní práce (GPS docházka)</td>
                  <td className="py-2.5 px-2 font-mono">{selectedClaimForDetail.hoursWorked} hod</td>
                  <td className="py-2.5 px-2 font-mono">380 Kč/h</td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold">
                    {selectedClaimForDetail.hourlyClaimAmount.toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2">Úkolová odměna za namontovanou plochu</td>
                  <td className="py-2.5 px-2 font-mono">{selectedClaimForDetail.surfaceM2Mounted} m²</td>
                  <td className="py-2.5 px-2 font-mono">65 Kč/m²</td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold">
                    {selectedClaimForDetail.pieceRateClaimAmount.toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2">Kvalitativní bonus za dodržení termínu</td>
                  <td className="py-2.5 px-2 font-mono">1 paušál</td>
                  <td className="py-2.5 px-2 font-mono">2 500 Kč</td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold">
                    2 500 Kč
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Total and SPAYD QR Code */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t-2 border-slate-900 pt-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-20 h-20 bg-slate-100 border border-slate-900 rounded-lg p-1.5 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-slate-950" />
                </div>
                <div className="text-xs">
                  <span className="font-mono font-bold text-slate-900 block">SPAYD QR PLATBA</span>
                  <span className="text-slate-500 text-[10px]">Okamžitá úhrada z bankovní aplikace</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Celková částka k vyplacení:</div>
                <div className="text-2xl font-black text-slate-950 font-mono">
                  {selectedClaimForDetail.totalAmount.toLocaleString('cs-CZ')} Kč
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Tisknout doklad</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedClaimForDetail(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Claim Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <span>Vystavení Montérské Faktury</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Montér / Vedoucí čety</label>
                <input
                  type="text"
                  value={monterName}
                  onChange={e => setMonterName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stavba</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Období (MM/YYYY)</label>
                  <input
                    type="text"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hodiny (GPS Docházka)</label>
                  <input
                    type="number"
                    value={hoursWorked}
                    onChange={e => setHoursWorked(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hodinová sazba (Kč/h)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Namontováno m²</label>
                  <input
                    type="number"
                    value={surfaceM2}
                    onChange={e => setSurfaceM2(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Úkolová odměna (Kč/m²)</label>
                  <input
                    type="number"
                    value={pieceRateM2}
                    onChange={e => setPieceRateM2(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bonus za termín / jakost (Kč)</label>
                <input
                  type="number"
                  value={bonusAmount}
                  onChange={e => setBonusAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center mt-2">
                <span className="text-slate-400">Celková fakturovaná částka:</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {(hoursWorked * hourlyRate + surfaceM2 * pieceRateM2 + bonusAmount).toLocaleString('cs-CZ')} Kč
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg cursor-pointer"
                >
                  Vystavit fakturu ke schválení
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
