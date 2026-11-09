import { useState } from 'react';
import { PdfPlanCanvas } from './PdfPlanCanvas.jsx';
import { DxfPlanCanvas } from './DxfPlanCanvas.jsx';

function MarkerPin({ marker }) {
  return (
    <div
      title={marker.text}
      className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-[10px] font-black text-white shadow-lg"
      style={{ left: `${marker.positionX * 100}%`, top: `${marker.positionY * 100}%` }}
    >
      !
    </div>
  );
}

/**
 * Dispatch vykreslení výkresu podle formátu. DWG nemá bezpečný klientský
 * parser (proprietární binární formát), proto nabízí jen stažení a
 * informaci, jak si náhled zajistit (export do PDF/DXF).
 */
export function PlanCanvas({ plan, markers, pageNumber, onPageCountChange, onCanvasClick }) {
  const [pendingMarker, setPendingMarker] = useState(null);

  function handleClick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const positionX = (event.clientX - rect.left) / rect.width;
    const positionY = (event.clientY - rect.top) / rect.height;
    onCanvasClick?.({ positionX, positionY, pageNumber: pageNumber || 1 });
  }

  const visibleMarkers = (markers || []).filter((marker) => (marker.pageNumber || 1) === (pageNumber || 1));
  const markerOverlay = visibleMarkers.map((marker) => <MarkerPin key={marker.id} marker={marker} />);

  if (plan.format === 'IMAGE') {
    return (
      <div className="relative inline-block w-full cursor-crosshair" onClick={handleClick}>
        <img src={plan.fileUrl} alt={plan.title} className="w-full rounded-2xl border border-slate-800 bg-white object-contain" />
        {markerOverlay}
      </div>
    );
  }

  if (plan.format === 'PDF') {
    return (
      <PdfPlanCanvas fileUrl={plan.fileUrl} pageNumber={pageNumber} onPageCountChange={onPageCountChange} onMarkerClick={handleClick}>
        {markerOverlay}
      </PdfPlanCanvas>
    );
  }

  if (plan.format === 'DXF') {
    return (
      <DxfPlanCanvas fileUrl={plan.fileUrl} onMarkerClick={handleClick}>
        {markerOverlay}
      </DxfPlanCanvas>
    );
  }

  // DWG — proprietární binární formát AutoCADu bez otevřené specifikace;
  // bezpečný klientský náhled zde není dostupný.
  return (
    <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-6 text-sm text-amber-200">
      <p className="font-black uppercase tracking-wide text-amber-300">Náhled DWG není podporován</p>
      <p className="mt-2">
        DWG je uzavřený binární formát AutoCADu bez otevřené specifikace, proto jej nelze bezpečně vykreslit přímo v prohlížeči.
        Soubor je uložený a lze jej stáhnout. Pro náhled ve webu exportujte výkres z CAD programu do PDF nebo DXF a nahrajte jej jako novou verzi.
      </p>
      <a href={plan.fileUrl} download={plan.fileName || undefined} className="mt-4 inline-block rounded-2xl bg-amber-600 px-4 py-2 text-xs font-black uppercase text-white">
        Stáhnout DWG soubor
      </a>
    </div>
  );
}
