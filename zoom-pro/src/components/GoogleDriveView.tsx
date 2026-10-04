import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  FolderPlus,
  Upload,
  RefreshCw,
  Search,
  Folder,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  File,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  FolderTree,
  Download,
  Share2,
  Sparkles,
  Cloud,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileCheck,
} from 'lucide-react';
import { GoogleDriveService, GoogleDriveFile, GoogleDriveUser } from '../services/googleDriveService';
import { Project, Document } from '../types';

interface GoogleDriveViewProps {
  projects: Project[];
  documents: Document[];
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({ projects, documents }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [user, setUser] = useState<GoogleDriveUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id?: string; name: string }[]>([
    { name: 'Můj Disk' },
  ]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileFilter, setFileFilter] = useState<'ALL' | 'FOLDERS' | 'CAD_PDF' | 'EXCEL' | 'IMAGES'>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Folder creation modal state
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    GoogleDriveService.init();
    const connected = GoogleDriveService.isConnected();
    setIsConnected(connected);
    if (connected) {
      setUser(GoogleDriveService.getUser());
    }
    loadFiles(currentFolderId);
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadFiles = async (folderId?: string) => {
    setLoading(true);
    try {
      const list = await GoogleDriveService.listFiles({
        folderId,
        searchQuery: searchQuery.trim() ? searchQuery : undefined,
      });
      setFiles(list);
    } catch (err: any) {
      console.error('Error loading Google Drive files:', err);
      showToast('error', err.message || 'Chyba při načítání souborů');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await GoogleDriveService.requestGoogleAuth();
      setIsConnected(true);
      const currentUser = GoogleDriveService.getUser();
      setUser(currentUser);
      showToast('success', 'Úspěšně propojeno s Google Drive!');
      await loadFiles(currentFolderId);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      // Fallback: Provide informative hint if popup or consent was blocked
      showToast('error', err.message || 'Nepodařilo se přihlásit k účtu Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    GoogleDriveService.clearSession();
    setIsConnected(false);
    setUser(null);
    showToast('info', 'Google Drive odpojen.');
    loadFiles(undefined);
  };

  const navigateToFolder = (folder: GoogleDriveFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadFiles(folder.id);
  };

  const navigateBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolderId(target.id);
    loadFiles(target.id);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setLoading(true);
    try {
      const created = await GoogleDriveService.createFolder(newFolderName.trim(), currentFolderId);
      showToast('success', `Složka "${created.name}" byla vytvořena.`);
      setNewFolderName('');
      setShowFolderModal(false);
      await loadFiles(currentFolderId);
    } catch (err: any) {
      showToast('error', err.message || 'Chyba při vytváření složky');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProjectStructure = async () => {
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;

    setLoading(true);
    try {
      const res = await GoogleDriveService.createProjectFolderStructure(proj.name, currentFolderId);
      showToast('success', `Projektová struktura pro "${proj.name}" byla vygenerována na Google Drive.`);
      setShowFolderModal(false);
      await loadFiles(currentFolderId);
    } catch (err: any) {
      showToast('error', err.message || 'Chyba při zakládání projektové struktury');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setLoading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        await GoogleDriveService.uploadFile(
          file.name,
          file.type || 'application/octet-stream',
          file,
          currentFolderId
        );
      }
      showToast('success', `Nahráno ${uploadedFiles.length} soubor(ů) na Google Drive.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadFiles(currentFolderId);
    } catch (err: any) {
      showToast('error', err.message || 'Chyba při nahrávání souboru');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDocumentToDrive = async (doc: Document) => {
    setLoading(true);
    try {
      const content = `=====================================================
DOKUMENT ZOOM-PRO VZT & TZB
=====================================================
Název: ${doc.title}
Typ: ${doc.type}
Projekt: ${doc.projectName || 'Neuvedeno'}
Stav: ${doc.status}
Vytvořeno: ${new Date(doc.createdAt || Date.now()).toLocaleString('cs-CZ')}
Schváleno: ${doc.approverName || doc.approverId || 'Čeká na podpis'}

OBSAH / PROTOKOL:
-----------------------------------------------------
${doc.content || 'Předávací protokol VZT díla v souladu s ČSN EN 1507.'}

Digitálně archivováno systémem ZOOM-PRO.
`;
      await GoogleDriveService.uploadFile(
        `${doc.title.replace(/\s+/g, '_')}_${doc.id.slice(0, 6)}.txt`,
        'text/plain',
        content,
        currentFolderId
      );
      showToast('success', `Protokol "${doc.title}" byl uložen na Google Drive.`);
      await loadFiles(currentFolderId);
    } catch (err: any) {
      showToast('error', err.message || 'Chyba při exportu protokolu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (file: GoogleDriveFile) => {
    if (!window.confirm(`Opravdu chcete smazat "${file.name}" z Google Drive?`)) return;

    setLoading(true);
    try {
      await GoogleDriveService.deleteFile(file.id);
      showToast('info', `Soubor "${file.name}" byl smazán.`);
      await loadFiles(currentFolderId);
    } catch (err: any) {
      showToast('error', err.message || 'Nepodařilo se smazat soubor');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (file: GoogleDriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-6 h-6 text-amber-400" />;
    }
    if (file.mimeType.includes('pdf')) {
      return <FileText className="w-6 h-6 text-red-400" />;
    }
    if (
      file.mimeType.includes('spreadsheet') ||
      file.mimeType.includes('excel') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.csv')
    ) {
      return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
    }
    if (file.mimeType.includes('image') || file.name.endsWith('.png') || file.name.endsWith('.jpg')) {
      return <FileImage className="w-6 h-6 text-purple-400" />;
    }
    if (file.name.endsWith('.dwg') || file.name.endsWith('.dxf')) {
      return <FileCode className="w-6 h-6 text-cyan-400" />;
    }
    return <File className="w-6 h-6 text-slate-400" />;
  };

  const formatFileSize = (sizeStr?: string) => {
    if (!sizeStr) return '';
    const bytes = parseInt(sizeStr, 10);
    if (isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter((f) => {
    if (fileFilter === 'FOLDERS') return f.mimeType === 'application/vnd.google-apps.folder';
    if (fileFilter === 'CAD_PDF') {
      return (
        f.mimeType.includes('pdf') ||
        f.name.toLowerCase().endsWith('.dwg') ||
        f.name.toLowerCase().endsWith('.dxf')
      );
    }
    if (fileFilter === 'EXCEL') {
      return (
        f.mimeType.includes('spreadsheet') ||
        f.name.toLowerCase().endsWith('.xlsx') ||
        f.name.toLowerCase().endsWith('.csv')
      );
    }
    if (fileFilter === 'IMAGES') {
      return (
        f.mimeType.includes('image') ||
        f.name.toLowerCase().endsWith('.jpg') ||
        f.name.toLowerCase().endsWith('.jpeg') ||
        f.name.toLowerCase().endsWith('.png')
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-lg transition-all animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-red-950/80 border-red-500/50 text-red-300'
              : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            {notification.type === 'info' && <ShieldCheck className="w-4 h-4 text-cyan-400" />}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-cyan-500/20">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Google Drive Synchronizace
              </h2>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-blue-500/30">
                Workspace OAuth
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Přímé ukládání a správa výkresů DWG, předávacích protokolů, stavebních fotek a rozpočtů na váš Google Drive.
            </p>
          </div>
        </div>

        {/* OAuth Authentication Button / Status */}
        <div className="flex items-center space-x-3">
          {isConnected ? (
            <div className="flex items-center space-x-3 bg-slate-950 p-2 sm:px-3.5 sm:py-2 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <div className="text-left font-mono text-[11px]">
                  <p className="text-emerald-400 font-semibold truncate max-w-[160px]">
                    {user?.displayName || 'Google Drive Připojen'}
                  </p>
                  <p className="text-slate-500 text-[9px] truncate max-w-[160px]">
                    {user?.emailAddress || 'drive.readonly + drive.file'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 border border-slate-800 transition-colors"
                title="Odpojit Google Drive"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Připojit Google Drive</span>
            </button>
          )}

          <button
            onClick={() => loadFiles(currentFolderId)}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
            title="Aktualizovat"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Action Bar & Storage Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Project Folder Generator Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <FolderTree className="w-4 h-4" />
              <span>Struktura projektů</span>
            </div>
            <p className="text-slate-400 text-xs">
              Vytvoří na Google Drive standardizovanou stromovou strukturu pro zvolenou stavbu (Výkresy, Protokoly, Fotky, Faktury).
            </p>
          </div>
          <button
            onClick={() => setShowFolderModal(true)}
            className="mt-3 w-full py-2 px-3 bg-cyan-950 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-800/40 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Založit strukturu stavby</span>
          </button>
        </div>

        {/* Upload & Drop Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Upload className="w-4 h-4" />
              <span>Nahrát dokument / DWG</span>
            </div>
            <p className="text-slate-400 text-xs">
              Nahrajte výkresy, stavební záznamy nebo revizní zprávy do aktuální složky na Google Drive.
            </p>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full py-2 px-3 bg-emerald-950 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-800/40 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Vybrat soubory k nahrání</span>
            </button>
          </div>
        </div>

        {/* 1-Click Protocol Sync Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
              <FileCheck className="w-4 h-4" />
              <span>Archivace protokolů</span>
            </div>
            <p className="text-slate-400 text-xs">
              Máte {documents.length} připravených protokolů a zkoušek těsnosti k uložení na Google Drive.
            </p>
          </div>
          <button
            onClick={() => {
              if (documents[0]) {
                handleExportDocumentToDrive(documents[0]);
              } else {
                showToast('info', 'Nemáte žádné protokoly k exportu');
              }
            }}
            className="mt-3 w-full py-2 px-3 bg-purple-950 hover:bg-purple-900/60 text-purple-300 text-xs font-semibold rounded-lg border border-purple-800/40 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Zálohovat aktivní protokol</span>
          </button>
        </div>
      </div>

      {/* Explorer Container */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Explorer Header Controls */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-1.5 text-xs font-medium overflow-x-auto no-scrollbar">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                <button
                  onClick={() => navigateBreadcrumb(idx)}
                  className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                    idx === breadcrumbs.length - 1
                      ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Hledat v Google Drive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFiles(currentFolderId)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Všechny typy</option>
              <option value="FOLDERS">Jen složky</option>
              <option value="CAD_PDF">Výkresy & PDF</option>
              <option value="EXCEL">Tabulky & Rozpočty</option>
              <option value="IMAGES">Fotodokumentace</option>
            </select>
          </div>
        </div>

        {/* File Table / Grid */}
        <div className="divide-y divide-slate-800/60 min-h-[300px]">
          {loading && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              <p className="text-xs font-mono">Načítám soubory z Google Drive...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Folder className="w-12 h-12 text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Tato složka je prázdná</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                Nahrajte projektové podklady nebo vytvořte novou podkategorii pro vzduchotechniku.
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
              return (
                <div
                  key={file.id}
                  className="px-4 py-3 hover:bg-slate-800/40 flex items-center justify-between transition-colors group"
                >
                  <div
                    className="flex items-center space-x-3 min-w-0 cursor-pointer flex-1"
                    onClick={() => {
                      if (isFolder) {
                        navigateToFolder(file);
                      } else if (file.webViewLink) {
                        window.open(file.webViewLink, '_blank');
                      }
                    }}
                  >
                    <div className="shrink-0">{getFileIcon(file)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500 mt-0.5">
                        {file.modifiedTime && (
                          <span>
                            Změněno:{' '}
                            {new Date(file.modifiedTime).toLocaleDateString('cs-CZ', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {!isFolder && file.size && <span>{formatFileSize(file.size)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Otevřít v Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                      title="Smazat soubor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Create Folder or Project Structure */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-cyan-400" />
                <span>Nová složka na Google Drive</span>
              </h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Option A: Custom Single Folder */}
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Název běžné složky
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="např. 06-Revize-2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || loading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Vytvořit
                </button>
              </div>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[11px] font-mono uppercase text-slate-500">
                NEBO PRO CELOU STAVBU
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Option B: Standard Project Package */}
            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <label className="block text-xs font-semibold text-cyan-300 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Automatická struktura pro zakázku</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.address || p.locationNote || 'Stavba'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Založí 5 standardizovaných složek pro výkresy, stavební deník, kusovníky, protokoly a fakturaci.
              </p>
              <button
                type="button"
                onClick={handleCreateProjectStructure}
                disabled={loading}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                Vygenerovat balíček pro vybranou stavbu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
