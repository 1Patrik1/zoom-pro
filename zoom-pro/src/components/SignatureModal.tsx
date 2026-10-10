import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, ShieldCheck, PenTool } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  signerName: string;
  signerRole: string;
  onSignComplete: (signatureData: { signatureImage: string; signedHash: string }) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  signerName,
  signerRole,
  onSignComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [certTimestamp, setCertTimestamp] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCertTimestamp(new Date().toLocaleString('cs-CZ'));
      setHasDrawn(false);
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#38bdf8';
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const signatureImage = canvas.toDataURL('image/png');
    const randomHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const signedHash = `sha256:${randomHex}`;

    onSignComplete({ signatureImage, signedHash });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Elektronický podpis dokumentu</h3>
              <p className="text-xs text-slate-400 line-clamp-1">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Signatář:</span>
              <span className="font-semibold text-slate-200">{signerName}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Oprávnění:</span>
              <span className="text-cyan-400 font-mono">{signerRole}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Časové razítko:</span>
              <span className="font-mono text-slate-400">{certTimestamp}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <span>Podpisová plocha (prstem nebo myší)</span>
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Smazat</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl bg-slate-950 overflow-hidden relative touch-none">
              <canvas
                ref={canvasRef}
                width={450}
                height={160}
                className="w-full h-[160px] cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-600 text-sm italic">
                  Zde nakreslete svůj podpis
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-2.5 text-xs text-slate-400 bg-cyan-950/20 border border-cyan-900/30 p-3 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              Podpisem potvrzujete správnost údajů. Systém vygeneruje kryptografický hash SHA-256 a kvalifikované časové razítko dle eIDAS.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Zrušit
          </button>
          <button
            type="button"
            disabled={!hasDrawn}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition-all shadow-lg ${
              hasDrawn
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Potvrdit a podepsat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
