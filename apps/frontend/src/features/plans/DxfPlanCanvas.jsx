import { useEffect, useRef, useState } from 'react';

/**
 * Vykreslí DXF výkres (otevřený vektorový CAD formát) na canvas.
 * Parser `dxf-parser` je načítán dynamicky, aby nezatěžoval hlavní bundle.
 * Podporuje základní entity: LINE, LWPOLYLINE/POLYLINE, CIRCLE, ARC, TEXT.
 */
export function DxfPlanCanvas({ fileUrl, onMarkerClick, children }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setLoading(true);
      setError('');
      try {
        const [{ default: DxfParser }, response] = await Promise.all([
          import('dxf-parser'),
          fetch(fileUrl)
        ]);
        if (!response.ok) throw new Error('DXF soubor se nepodařilo stáhnout');
        const text = await response.text();
        if (cancelled) return;

        const parser = new DxfParser();
        const dxf = parser.parseSync(text);
        if (cancelled) return;

        drawDxf(canvasRef.current, containerRef.current?.clientWidth || 800, dxf);
      } catch (err) {
        if (!cancelled) setError(err.message || 'DXF výkres se nepodařilo zobrazit');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [fileUrl]);

  return (
    <div ref={containerRef} className="relative w-full">
      {loading && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Načítám DXF…</div>}
      {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{error}</div>}
      <div className="relative" onClick={onMarkerClick}>
        <canvas ref={canvasRef} className="w-full rounded-2xl border border-slate-800 bg-white" />
        {children}
      </div>
    </div>
  );
}

function collectBounds(entities) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function visit(point) {
    if (!point) return;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  for (const entity of entities) {
    if (entity.vertices) entity.vertices.forEach(visit);
    if (entity.start) visit(entity.start);
    if (entity.end) visit(entity.end);
    if (entity.center) {
      const r = entity.radius || 0;
      visit({ x: entity.center.x - r, y: entity.center.y - r });
      visit({ x: entity.center.x + r, y: entity.center.y + r });
    }
    if (entity.position) visit(entity.position);
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  return { minX, minY, maxX, maxY };
}

function drawDxf(canvas, containerWidth, dxf) {
  const entities = dxf?.entities || [];
  const { minX, minY, maxX, maxY } = collectBounds(entities);
  const padding = 20;
  const drawingWidth = Math.max(1, maxX - minX);
  const drawingHeight = Math.max(1, maxY - minY);
  const scale = (containerWidth - padding * 2) / drawingWidth;
  const height = drawingHeight * scale + padding * 2;

  canvas.width = containerWidth;
  canvas.height = Math.max(200, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1e293b';
  ctx.fillStyle = '#1e293b';
  ctx.lineWidth = 1;

  // DXF má osu Y nahoru, canvas má osu Y dolů -> invertujeme při mapování.
  const toCanvas = (x, y) => [
    padding + (x - minX) * scale,
    canvas.height - (padding + (y - minY) * scale)
  ];

  for (const entity of entities) {
    ctx.beginPath();
    if (entity.type === 'LINE' && entity.start && entity.end) {
      const [x1, y1] = toCanvas(entity.start.x, entity.start.y);
      const [x2, y2] = toCanvas(entity.end.x, entity.end.y);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices?.length) {
      entity.vertices.forEach((vertex, index) => {
        const [x, y] = toCanvas(vertex.x, vertex.y);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (entity.shape) ctx.closePath();
      ctx.stroke();
    } else if (entity.type === 'CIRCLE' && entity.center) {
      const [cx, cy] = toCanvas(entity.center.x, entity.center.y);
      ctx.arc(cx, cy, Math.max(1, entity.radius * scale), 0, Math.PI * 2);
      ctx.stroke();
    } else if (entity.type === 'ARC' && entity.center) {
      const [cx, cy] = toCanvas(entity.center.x, entity.center.y);
      const startAngle = -(entity.endAngle || 0) * (Math.PI / 180);
      const endAngle = -(entity.startAngle || 0) * (Math.PI / 180);
      ctx.arc(cx, cy, Math.max(1, entity.radius * scale), startAngle, endAngle);
      ctx.stroke();
    } else if ((entity.type === 'TEXT' || entity.type === 'MTEXT') && entity.startPoint) {
      const [x, y] = toCanvas(entity.startPoint.x, entity.startPoint.y);
      ctx.font = `${Math.max(8, (entity.textHeight || 2.5) * scale)}px sans-serif`;
      ctx.fillText(entity.text || '', x, y);
    }
  }
}
