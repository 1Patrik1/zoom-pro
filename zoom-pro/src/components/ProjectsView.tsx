import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Camera,
  MessageSquare,
  Plus,
  Send,
  Image,
  Navigation,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Project, ProjectComment, ProjectPhoto } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  comments: ProjectComment[];
  photos: ProjectPhoto[];
  onAddComment: (comment: { projectId: string; authorName: string; text: string; imageUrl?: string }) => Promise<void>;
  onAddPhoto: (photo: { projectId: string; caption: string; url: string; category: string }) => Promise<void>;
  onAddProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  comments,
  photos,
  onAddComment,
  onAddPhoto,
  onAddProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'gallery'>('chat');
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState('');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  // New Project Form state
  const [newCode, setNewCode] = useState('STAV-2026-004');
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newBudget, setNewBudget] = useState(1500000);
  const [newRadius, setNewRadius] = useState(200);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const projectComments = comments.filter(c => c.projectId === selectedProjectId);
  const projectPhotos = photos.filter(p => p.projectId === selectedProjectId);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !commentImage) return;
    await onAddComment({
      projectId: selectedProjectId,
      authorName: 'Patrik Vedoucí',
      text: commentText,
      imageUrl: commentImage || undefined,
    });
    setCommentText('');
    setCommentImage('');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddProject({
      companyId: '00000000-0000-4000-8000-000000000001',
      code: newCode,
      name: newName,
      address: newAddress,
      clientName: newClient,
      lat: 50.0878,
      lng: 14.4205,
      radius: newRadius,
      status: 'ACTIVE',
      budget: newBudget,
      currency: 'CZK',
    });
    setShowAddProjectModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-cyan-400" />
            <span>Stavby & Projekty s Fotochatem</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            GPS souřadnice pro geofencing docházky, fotogalerie montáží a týmová diskuze
          </p>
        </div>

        <button
          onClick={() => setShowAddProjectModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Založit novou stavbu</span>
        </button>
      </div>

      {/* Projects Grid & Selected Project Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Project Selector List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Seznam zakázek ({projects.length})
          </div>

          <div className="space-y-2.5">
            {projects.map(proj => (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedProjectId === proj.id
                    ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">
                    {proj.code}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {proj.status === 'ACTIVE' ? 'Probíhá' : 'Dokončeno'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm mt-2">{proj.name}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{proj.address}</span>
                </p>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Geofence: <strong className="text-slate-200">{proj.radius}m</strong></span>
                  <span className="font-mono text-emerald-400 font-semibold">{proj.budget?.toLocaleString('cs-CZ')} Kč</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Detail Hub (8 cols) */}
        {selectedProject && (
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col min-h-[500px]">
            {/* Project Summary Banner */}
            <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">
                    {selectedProject.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-100">{selectedProject.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{selectedProject.address} (GPS: {selectedProject.lat?.toFixed(4)}, {selectedProject.lng?.toFixed(4)} • Radius {selectedProject.radius}m)</span>
                </p>
              </div>

              {/* Detail Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'chat' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Fotochat ({projectComments.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    activeTab === 'gallery' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Galerie ({projectPhotos.length})</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: CHAT */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between pt-4 space-y-4">
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {projectComments.map(comm => (
                    <div key={comm.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-cyan-400">{comm.authorName}</span>
                        <span className="font-mono text-[10px]">
                          {new Date(comm.createdAt).toLocaleString('cs-CZ')}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{comm.text}</p>
                      {comm.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-700 max-w-sm">
                          <img
                            src={comm.imageUrl}
                            alt="Stavební fotka"
                            className="w-full h-44 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {projectComments.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-500">
                      Zatím žádné zprávy v chatu stavby. Pošlete první zprávu nebo fotku z montáže!
                    </div>
                  )}
                </div>

                {/* Send Chat Message Form */}
                <form onSubmit={handleSendComment} className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Napsat poznámku z montáže nebo dotaz na stavbyvedoucího..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md"
                      title="Odeslat zprávu"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Přiložit URL fotky stavby:</span>
                    <input
                      type="url"
                      value={commentImage}
                      onChange={e => setCommentImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: GALLERY */}
            {activeTab === 'gallery' && (
              <div className="flex-1 pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {projectPhotos.map(ph => (
                    <div key={ph.id} className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group shadow">
                      <img
                        src={ph.url}
                        alt={ph.caption}
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="p-2.5 text-xs">
                        <div className="font-semibold text-slate-200 line-clamp-1">{ph.caption}</div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                          <span>{ph.category}</span>
                          <span>{new Date(ph.createdAt).toLocaleDateString('cs-CZ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center">
                  <Camera className="w-8 h-8 text-cyan-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Nahrát fotodokumentaci z mobilu</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Podpora přímého focení z fotoaparátu na stavbě</p>
                  <button
                    onClick={() =>
                      onAddPhoto({
                        projectId: selectedProjectId,
                        caption: 'Montáž VZT trasy ' + new Date().toLocaleDateString('cs-CZ'),
                        url: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=800',
                        category: 'MONTÁŽ',
                      })
                    }
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700"
                  >
                    + Přidat vzorovou fotografii
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <span>Založení nové stavby</span>
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Kód stavby</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Objednatel / Klient</label>
                  <input
                    type="text"
                    value={newClient}
                    onChange={e => setNewClient(e.target.value)}
                    required
                    placeholder="Např. Skanska a.s."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Název stavby</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  placeholder="Např. Nemocnice Motol — Pavilon C"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Adresa stavby</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  required
                  placeholder="Např. V Úvalu 84, Praha 5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Rozpočet (Kč)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={e => setNewBudget(parseInt(e.target.value) || 0)}
                    step="50000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Geofence Radius (metrů)</label>
                  <input
                    type="number"
                    value={newRadius}
                    onChange={e => setNewRadius(parseInt(e.target.value) || 50)}
                    step="25"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow"
                >
                  Vytvořit stavbu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
