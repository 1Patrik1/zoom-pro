import React, { useState } from 'react';
import {
  AlertTriangle,
  QrCode,
  Printer,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  Plus,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SiteCollision, QrLabelSpec } from '../types';

interface CollisionsQrViewProps {
  collisions: SiteCollision[];
  qrLabels: QrLabelSpec[];
  onAddCollision: (col: Omit<SiteCollision, 'id' | 'createdAt'>) => void;
  onUpdateCollisionStatus: (id: string, status: SiteCollision['status']) => void;
  onPrintQrLabel: (id: string) => void;
}

export const CollisionsQrView: React.FC<CollisionsQrViewProps> = ({
  collisions,
  qrLabels,
  onAddCollision,
  onUpdateCollisionStatus,
  onPrintQrLabel,
}) => {
  const [activeTab, setActiveTab] = useState<'kolize' | 'qr'>('kolize');
  const [showAddCollisionModal, setShowAddCollisionModal] = useState(false);

  // New collision form
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('Logistické Centrum D1 Park');
  const [location, setLocation] = useState('2.NP - Osa C14 u požární klapky');
  const [severity, setSeverity] = useState<SiteCollision['severity']>('HIGH');
  const [conflictingTrade, setConflictingTrade] = useState<SiteCollision['conflictingTrade']>('ZTI');
  const [description, setDescription] = useState('');

  const handleCreateCollision = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCollision({
      projectId: 'proj-001',
      projectName,
      title,
      location,
      severity,
      conflictingTrade,
      status: 'OPEN',
      reportedByName: 'Jan Novák (Vedoucí stavby)',
      photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
      description,
    });
    setShowAddCollisionModal(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              Site Operations & BIM
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <span>Stavební Kolize & Generátor QR Štítků</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Záznam a řešení prostorových kolizí VZT tras na stavbě a tisk identifikačních QR štítků pro výrobu
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('kolize')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'kolize' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kolize tras ({collisions.length})
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'qr' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              QR Štítky pro dílnu ({qrLabels.length})
            </button>
          </div>

          {activeTab === 'kolize' && (
            <button
              onClick={() => setShowAddCollisionModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center space-x-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Zaznamenat kolizi</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: KOLIZE */}
      {activeTab === 'kolize' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collisions.map(col => {
            const sevColor =
              col.severity === 'CRITICAL'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : col.severity === 'HIGH'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : col.severity === 'MEDIUM'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700';

            return (
              <div
                key={col.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${sevColor}`}>
                      {col.severity} • {col.conflictingTrade}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {col.createdAt.split('T')[0]}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 mt-2.5">{col.title}</h3>
                  <div className="text-xs text-cyan-400 flex items-center space-x-1 mt-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{col.location}</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    {col.description}
                  </p>

                  {col.photoUrl && (
                    <div className="mt-3 aspect-video rounded-xl overflow-hidden border border-slate-800">
                      <img src={col.photoUrl} alt="Kolize foto" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3 mt-4 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Nahlásil: <span className="text-slate-300">{col.reportedByName}</span>
                  </div>

                  <select
                    value={col.status}
                    onChange={e => onUpdateCollisionStatus(col.id, e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-400 focus:outline-none"
                  >
                    <option value="OPEN">OPEN (Otevřeno)</option>
                    <option value="IN_PROGRESS">V ŘEŠENÍ</option>
                    <option value="RESOLVED">VYŘEŠENO</option>
                    <option value="ACCEPTED_COMPROMISE">KOMPROMIS</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: QR ŠTÍTKY */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-rose-400" />
                <span>QR Štítky pro dílenskou výrobu & montážní značení</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Každý VZT díl má vygenerovaný QR kód se specifikací, číslem pozice, patrem a napojením trasy.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Hromadný tisk štítků</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {qrLabels.map(label => (
              <div
                key={label.id}
                className="bg-white text-slate-950 p-4 rounded-2xl border-2 border-slate-300 shadow-xl flex flex-col justify-between font-sans"
              >
                <div>
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">VZT SYSTEM s.r.o.</div>
                      <div className="text-base font-black text-slate-950 font-mono leading-none mt-0.5">{label.tag}</div>
                      <div className="text-[11px] font-bold text-slate-700">{label.projectCode}</div>
                    </div>

                    {/* Simulated SVG QR */}
                    <div className="w-14 h-14 bg-slate-950 p-1.5 rounded-lg flex items-center justify-center text-white">
                      <QrCode className="w-full h-full text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mt-2.5 font-mono">
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Typ prvku</div>
                      <div className="font-bold text-slate-950 truncate">{label.componentType}</div>
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Rozměr</div>
                      <div className="font-bold text-slate-950">{label.dimensions}</div>
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Pozice / Patro</div>
                      <div className="font-bold text-slate-950">{label.positionNumber} ({label.floor})</div>
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Větev</div>
                      <div className="font-bold text-slate-950">{label.systemBranch}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2.5 mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-mono">ČSN EN 1507 / Třída B</span>
                  <button
                    onClick={() => onPrintQrLabel(label.id)}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center space-x-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Tisk (100x60mm)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Collision Modal */}
      {showAddCollisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Záznam Nové Montážní Kolize</span>
            </h3>

            <form onSubmit={handleCreateCollision} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Název kolizního místa</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="Křížení páteře VZT s odpadním potrubím DN110"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Závažnost</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="LOW">NÍZKÁ</option>
                    <option value="MEDIUM">STŘEDNÍ</option>
                    <option value="HIGH">VYSOKÁ</option>
                    <option value="CRITICAL">KRITICKÁ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Konfliktní profese</label>
                  <select
                    value={conflictingTrade}
                    onChange={e => setConflictingTrade(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="ZTI">ZTI (Voda / Odpady)</option>
                    <option value="ELEKTRO">Elektro kabelové žlaby</option>
                    <option value="STATIKA">Statika / ŽB průvlak</option>
                    <option value="CHLAZENI">Chlazení</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Přesná lokalizace na stavbě</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                  placeholder="1.PP Strojovna VZT u sloupu S-4"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Popis problému a navržené řešení</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Potrubí 800x400 nelze protáhnout kvůli spádu ležaté kanalizace. Nutno použít sníženou přechodku 1000x300..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCollisionModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Uložit kolizi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
