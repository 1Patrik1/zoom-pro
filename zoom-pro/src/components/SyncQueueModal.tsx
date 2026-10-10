import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  Send,
  CloudOff,
  CloudLightning,
  X,
  FileText,
  MapPin,
  Camera,
  Boxes,
  PenTool,
  ShieldCheck,
  Zap,
  RotateCcw,
  CheckCheck,
} from 'lucide-react';
import { SyncQueueService, PendingSyncItem } from '../services/syncQueueService';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onTriggerSync?: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onTriggerSync,
}) => {
  const [queue, setQueue] = useState<PendingSyncItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<PendingSyncItem | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'ALL' | 'QUEUED' | 'FAILED' | 'RESOLVED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = SyncQueueService.subscribe((updatedQueue) => {
      setQueue(updatedQueue);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRetrySingle = async (item: PendingSyncItem) => {
    setIsProcessing(true);
    const success = await SyncQueueService.retryItem(item.id);
    setIsProcessing(false);
    if (success) {
      showToast(`Položka "${item.title}" byla úspěšně odeslána.`);
      if (onTriggerSync) onTriggerSync();
    } else {
      showToast(`Chyba při odesílání: ${item.title}`);
    }
  };

  const handleSyncAll = async () => {
    setIsProcessing(true);
    const res = await SyncQueueService.syncAllPending();
    setIsProcessing(false);
    if (res.total === 0) {
      showToast('Žádné čekající položky k synchronizaci.');
    } else {
      showToast(
        `Synchronizace dokončena: ${res.successful} z ${res.total} položek odesláno.`
      );
      if (onTriggerSync) onTriggerSync();
    }
  };

  const handleRemove = (item: PendingSyncItem) => {
    if (window.confirm(`Opravdu chcete odebrat z fronty záznam "${item.title}"?`)) {
      SyncQueueService.removeItem(item.id);
      if (selectedItem?.id === item.id) setSelectedItem(null);
      showToast('Záznam byl z fronty smazán.');
    }
  };

  const handleClearResolved = () => {
    SyncQueueService.clearResolved();
    showToast('Vyčištěny všechny úspěšně synchronizované záznamy.');
  };

  const getItemIcon = (type: PendingSyncItem['type']) => {
    switch (type) {
      case 'ATTENDANCE':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'DAILY_LOG':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'COLLISION_REPORT':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'DOCUMENT_SIGN':
        return <PenTool className="w-4 h-4 text-purple-400" />;
      case 'WAREHOUSE_MOVE':
        return <Boxes className="w-4 h-4 text-blue-400" />;
      default:
        return <CloudLightning className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const pendingCount = queue.filter((i) => i.status === 'QUEUED' || i.status === 'FAILED').length;
  const failedCount = queue.filter((i) => i.status === 'FAILED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3.5">
            <div
              className={`p-2.5 rounded-xl border ${
                !isOnline
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                  : pendingCount > 0
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {!isOnline ? (
                <CloudOff className="w-6 h-6 animate-pulse" />
              ) : (
                <CloudLightning className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">
                  Fronta offline synchronizace (Pending Sync Queue)
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    !isOnline
                      ? 'bg-amber-950 text-amber-400 border-amber-800/60'
                      : 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                  }`}
                >
                  {isOnline ? 'Online Připojení' : 'Offline Režim'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Všechny změny provedené bez internetu (docházka, zápisy, fotky, výměry) jsou
                zde zabezpečené a čekají na odeslání.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls & Statistics Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vše ({queue.length})
            </button>
            <button
              onClick={() => setFilter('QUEUED')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'QUEUED'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Čekající ({queue.filter((i) => i.status === 'QUEUED').length})
            </button>
            <button
              onClick={() => setFilter('FAILED')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'FAILED'
                  ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chyby ({failedCount})
            </button>
            <button
              onClick={() => setFilter('RESOLVED')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'RESOLVED'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Odesláno ({queue.filter((i) => i.status === 'RESOLVED').length})
            </button>
          </div>

          {/* Sync & Clear Actions */}
          <div className="flex items-center space-x-2">
            {queue.some((i) => i.status === 'RESOLVED') && (
              <button
                onClick={handleClearResolved}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Vyčistit hotové"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vyčistit vyřešené</span>
              </button>
            )}

            <button
              onClick={handleSyncAll}
              disabled={isProcessing || pendingCount === 0}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Odeslat všechny změny ({pendingCount})</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-3 bg-cyan-950/90 border border-cyan-500/50 rounded-xl text-cyan-200 text-xs flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Body: List and Detail Split */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Queue List (7 Cols) */}
          <div className="lg:col-span-7 space-y-2.5">
            {filteredQueue.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-200">
                  Fronta synchronizace je čistá
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Žádné neuložené změny v offline mezipaměti. Veškerá data montérů a staveb jsou
                  100% synchronizována s cloudovým serverem.
                </p>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/80 border-cyan-500/50 shadow-md'
                        : 'bg-slate-900/60 hover:bg-slate-800/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                          {getItemIcon(item.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {item.title}
                            </span>
                            <span
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                                item.status === 'QUEUED'
                                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40'
                                  : item.status === 'SYNCING'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800/40 animate-pulse'
                                  : item.status === 'FAILED'
                                  ? 'bg-red-950 text-red-400 border border-red-800/40'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              }`}
                            >
                              {item.status === 'QUEUED' && 'Čeká'}
                              {item.status === 'SYNCING' && 'Odesílám...'}
                              {item.status === 'FAILED' && `Chyba (${item.retryCount}x)`}
                              {item.status === 'RESOLVED' && 'OK'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {item.description}
                          </p>

                          <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500 mt-1.5">
                            <span>{new Date(item.createdAt).toLocaleTimeString('cs-CZ')}</span>
                            <span>•</span>
                            <span className="text-slate-400">{item.endpoint}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick item actions */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {item.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetrySingle(item);
                            }}
                            disabled={isProcessing}
                            className="p-1.5 bg-slate-950 hover:bg-cyan-950 text-cyan-400 rounded-lg border border-slate-800 transition-colors"
                            title="Zkusit odeslat znovu"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(item);
                          }}
                          className="p-1.5 bg-slate-950 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 transition-colors"
                          title="Odstranit záznam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.errorMessage && (
                      <div className="mt-2 text-[10px] text-red-300 bg-red-950/50 border border-red-900/60 p-2 rounded-lg font-mono">
                        ⚠️ {item.errorMessage}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Item Payload & Payload Inspector (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            {selectedItem ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Detail změny & Payload
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    {selectedItem.method}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-white">{selectedItem.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-[10px] font-mono space-y-1 text-slate-300">
                  <div>
                    <span className="text-slate-500">Endpoint:</span> {selectedItem.endpoint}
                  </div>
                  <div>
                    <span className="text-slate-500">Vytvořeno:</span>{' '}
                    {new Date(selectedItem.createdAt).toLocaleString('cs-CZ')}
                  </div>
                  <div>
                    <span className="text-slate-500">Počet pokusů:</span>{' '}
                    {selectedItem.retryCount}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
                    JSON Data k odeslání:
                  </label>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 select-all">
                    {JSON.stringify(selectedItem.payload, null, 2)}
                  </pre>
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  {selectedItem.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleRetrySingle(selectedItem)}
                      disabled={isProcessing}
                      className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Odeslat na server</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(selectedItem)}
                    className="py-2 px-3 bg-red-950/60 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Smazat
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <CloudLightning className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-300">
                  Vyberte záznam pro zobrazení detailu
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Uvidíte přesná data uložená v IndexedDB a můžete je ručně odeslat nebo upravit.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PWA Local IndexedDB Persistence: Aktivní</span>
          </div>
          <div className="text-slate-500">
            Při obnovení internetového připojení se data automaticky odešlou.
          </div>
        </div>
      </div>
    </div>
  );
};
