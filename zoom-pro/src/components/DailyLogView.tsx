import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Lock,
  Unlock,
  CloudSun,
  Users,
  ShieldCheck,
  CheckCircle,
  PenTool,
  Calendar,
} from 'lucide-react';
import { DailyLog, Project, User } from '../types';
import { SignatureModal } from './SignatureModal';

interface DailyLogViewProps {
  currentUser: User;
  projects: Project[];
  dailyLogs: DailyLog[];
  onAddDailyLog: (log: Omit<DailyLog, 'id' | 'createdAt'>) => Promise<void>;
  onSignDailyLog: (id: string, signatureHash: string, signerName: string) => Promise<void>;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  currentUser,
  projects,
  dailyLogs,
  onAddDailyLog,
  onSignDailyLog,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Polojasno, 18°C, bez srážek');
  const [workerCount, setWorkerCount] = useState(4);
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Signature Modal state
  const [signingLog, setSigningLog] = useState<DailyLog | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);
    await onAddDailyLog({
      companyId: '00000000-0000-4000-8000-000000000001',
      projectId: selectedProjectId,
      projectName: proj?.name,
      authorId: currentUser.id,
      authorName: `${currentUser.firstName} ${currentUser.lastName}`,
      logDate,
      weather,
      workerCount,
      content,
      isLocked: false,
    });
    setContent('');
    setIsCreating(false);
  };

  const handleSignComplete = async (signatureData: { signatureImage: string; signedHash: string }) => {
    if (!signingLog) return;
    await onSignDailyLog(
      signingLog.id,
      signatureData.signedHash,
      `${currentUser.firstName} ${currentUser.lastName}`
    );
    setSigningLog(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            <span>Elektronický Stavební Deník VZT</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Záznamy průběhu montáže, klimatické podmínky a neměnný uzamčený e-podpis
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Zavřít formulář' : 'Nový denní zápis'}</span>
        </button>
      </div>

      {/* Create New Daily Log Form */}
      {isCreating && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl animate-fade-in">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            <span>Vytvořit denní záznam montáže</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stavba / Projekt</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Datum zápisu</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Počet montérů na stavbě</label>
                <input
                  type="number"
                  value={workerCount}
                  onChange={e => setWorkerCount(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Počasí a teplota</label>
              <input
                type="text"
                value={weather}
                onChange={e => setWeather(e.target.value)}
                placeholder="Jasno, 21°C, bezvětří"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Popis provedených montážních prací a zjištěné skutečnosti
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                placeholder="Zahájení montáže VZT stoupaček v šachtě Š1. Osazení tlumicích vložek a požárních klapek PK1-PK4. Tlaková zkouška těsnosti třídy B proběhla úspěšně bez závad..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg"
              >
                Uložit denní záznam
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daily Logs Timeline Cards */}
      <div className="space-y-4">
        {dailyLogs.map(log => (
          <div
            key={log.id}
            className={`p-6 rounded-2xl border transition-all shadow-xl ${
              log.isLocked
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-slate-900/90 border-amber-500/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-100 text-sm">{log.logDate}</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-semibold text-cyan-400 text-xs">{log.projectName}</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center space-x-1">
                    <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{log.weather}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>{log.workerCount} montérů</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {log.isLocked ? (
                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Podepsáno & Uzamčeno</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Otevřeno k podpisu</span>
                  </div>
                )}

                {!log.isLocked && (
                  <button
                    onClick={() => setSigningLog(log)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Elektronicky podepsat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content text */}
            <div className="pt-4 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {log.content}
            </div>

            {/* Signatures & Security Audit Footer */}
            {log.isLocked && log.signedBy && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    Digitálně stvrzeno: <strong className="text-slate-200">{log.signedBy}</strong> ({new Date(log.signedAt!).toLocaleString('cs-CZ')})
                  </span>
                </div>
                {log.signatureHash && (
                  <span className="font-mono text-slate-500 text-[10px]">
                    HASH: {log.signatureHash.slice(0, 24)}...
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Signature Modal */}
      {signingLog && (
        <SignatureModal
          isOpen={!!signingLog}
          onClose={() => setSigningLog(null)}
          documentTitle={`Stavební deník — ${signingLog.projectName} (${signingLog.logDate})`}
          signerName={`${currentUser.firstName} ${currentUser.lastName}`}
          signerRole={currentUser.role}
          onSignComplete={handleSignComplete}
        />
      )}
    </div>
  );
};
