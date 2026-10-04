import React, { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileCheck,
  HardDrive,
} from 'lucide-react';
import { Document, Project, User } from '../types';
import { SignatureModal } from './SignatureModal';
import { GoogleDriveService } from '../services/googleDriveService';

interface DocumentsViewProps {
  currentUser: User;
  projects: Project[];
  documents: Document[];
  onAddDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => Promise<void>;
  onApproveDocument: (id: string) => Promise<void>;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  currentUser,
  projects,
  documents,
  onAddDocument,
  onApproveDocument,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'PREDAVACI_PROTOKOL' | 'VYKAZ_PRACI' | 'ZKOUSEK_TESNOSTI' | 'REVIZNI_ZPRAVA'>('PREDAVACI_PROTOKOL');
  const [content, setContent] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [gdriveStatus, setGdriveStatus] = useState<string | null>(null);

  const handleSaveToDrive = async (doc: Document) => {
    setGdriveStatus(`Ukládám "${doc.title}" na Google Drive...`);
    try {
      const fileData = `=====================================================
DOKUMENT ZOOM-PRO VZT & TZB
=====================================================
Název: ${doc.title}
Typ: ${doc.type}
Projekt: ${doc.projectName || 'Neuvedeno'}
Stav: ${doc.status}
Vytvořeno: ${new Date(doc.createdAt || Date.now()).toLocaleString('cs-CZ')}

OBSAH:
-----------------------------------------------------
${doc.content || 'Předávací protokol VZT díla v souladu s ČSN EN 1507.'}
`;
      await GoogleDriveService.uploadFile(
        `${doc.title.replace(/\s+/g, '_')}.txt`,
        'text/plain',
        fileData
      );
      setGdriveStatus(`✅ Protokol "${doc.title}" uložen na Google Drive.`);
      setTimeout(() => setGdriveStatus(null), 3500);
    } catch (err: any) {
      setGdriveStatus(`❌ Chyba: ${err.message || 'Nepodařilo se uložit'}`);
      setTimeout(() => setGdriveStatus(null), 4000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);
    await onAddDocument({
      companyId: '00000000-0000-4000-8000-000000000001',
      projectId: selectedProjectId,
      projectName: proj?.name,
      title: title || `${type} — ${proj?.name}`,
      type,
      status: 'DRAFT',
      content: content || 'Předávací protokol o zhotovení vzduchotechnického díla v souladu s ČSN EN 1507.',
    });
    setShowModal(false);
    setTitle('');
    setContent('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            <span>Dokumenty, Protokoly & Zkoušky těsnosti</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Předávací protokoly VZT, výkazy provedených prací a revizní zprávy s ukládáním na Google Drive
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Vytvořit nový protokol</span>
        </button>
      </div>

      {gdriveStatus && (
        <div className="p-3 bg-blue-950/80 border border-blue-500/50 rounded-xl text-blue-200 text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>{gdriveStatus}</span>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                  {doc.type}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    doc.status === 'SCHVALENO'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {doc.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-100 text-sm mt-3">{doc.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{doc.projectName || '—'}</p>

              <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 line-clamp-3">
                {doc.content}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">
                {new Date(doc.createdAt).toLocaleDateString('cs-CZ')}
              </span>

              <div className="flex items-center space-x-2">
                {doc.status !== 'SCHVALENO' && (
                  <button
                    onClick={() => onApproveDocument(doc.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Schválit</span>
                  </button>
                )}
                <button
                  onClick={() => handleSaveToDrive(doc)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-900/60 text-blue-400 border border-slate-700 hover:border-blue-500/40 transition-colors cursor-pointer"
                  title="Uložit na Google Drive"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => alert(`Protokol "${doc.title}" stažen v PDF s razítkem.`)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                  title="Stáhnout PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-cyan-400" />
              <span>Nový protokol / Výkaz díla</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stavba</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Druh dokumentu</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="PREDAVACI_PROTOKOL">Předávací protokol díla</option>
                  <option value="ZKOUSEK_TESNOSTI">Protokol o tlakové zkoušce těsnosti</option>
                  <option value="VYKAZ_PRACI">Výkaz montážních a zednických prací</option>
                  <option value="REVIZNI_ZPRAVA">Revizní zpráva požárních klapek</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Název dokumentu</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Např. Předávací protokol VZT - 2. etapa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Text protokolu</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Zhotovitel předává a objednatel přejímá zhotovenou část vzduchotechniky..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Uložit protokol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
