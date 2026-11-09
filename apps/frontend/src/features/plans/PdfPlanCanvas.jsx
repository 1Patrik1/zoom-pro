import { useEffect, useRef, useState } from 'react';

/**
 * Vykreslí PDF výkres na canvas pomocí pdfjs-dist. Knihovna i worker se
 * importují dynamicky, aby nezatěžovaly hlavní bundle, pokud uživatel
 * PDF výkres vůbec neotevře.
 */
export function PdfPlanCanvas({ fileUrl, pageNumber, onPageCountChange, onMarkerClick, children }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;

    async function render() {
      setLoading(true);
      setError('');
      try {
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = await import('pdfjs-dist/build/pdf.worker.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;

        const doc = await pdfjs.getDocument(fileUrl).promise;
        if (cancelled) return;
        onPageCountChange?.(doc.numPages);

        const safePage = Math.min(Math.max(1, pageNumber || 1), doc.numPages);
        const page = await doc.getPage(safePage);
        if (cancelled) return;

        const containerWidth = containerRef.current?.clientWidth || 800;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (err) {
        if (!cancelled) setError(err.message || 'PDF výkres se nepodařilo zobrazit');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    render();
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [fileUrl, pageNumber, onPageCountChange]);

  return (
    <div ref={containerRef} className="relative w-full">
      {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Načítám PDF…</div>}
      {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{error}</div>}
      <div className="relative" onClick={onMarkerClick}>
        <canvas ref={canvasRef} className="w-full rounded-2xl border border-slate-800 bg-white" />
        {children}
      </div>
    </div>
  );
}
