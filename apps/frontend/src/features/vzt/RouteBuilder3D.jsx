import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STANDARD_ROUND_DIAMETERS_MM } from './constants.js';
import { sizeDuctForFlow } from './engine.js';

// Three.js se načítá z lokálního balíčku aplikace, bez závislosti na CDN.

function aggregateBom(segments) {
  const aggregate = {};
  (segments || []).forEach((segment) => {
    const spec = segment.shape === 'round' ? `ø${segment.dia}` : `${segment.a}x${segment.b}`;
    const isStraight = segment.type === 'straight';
    const key = `${isStraight ? 'PIPE' : 'BEND'}-${segment.shape}-${spec}`;
    const name = isStraight
      ? (segment.shape === 'round' ? `Spiro Ø${segment.dia}` : `Kanál ${segment.a}×${segment.b}`)
      : (segment.shape === 'round' ? `Koleno Ø${segment.dia} 90°` : `Oblouk ${segment.a}×${segment.b} 90°`);
    if (!aggregate[key]) aggregate[key] = { name, spec, qty: 0, unit: isStraight ? 'm' : 'ks' };
    aggregate[key].qty += isStraight ? Math.max(0, Number(segment.length) || 0) / 1000 : 1;
  });
  return Object.values(aggregate);
}

export function RouteBuilder3D({ storageKey = 'zoompro:vzt:routes' }) {
  const containerRef = useRef(null);
  const stateRef = useRef({ segments: [] });
  const rebuildRef = useRef(() => {});
  const [shape, setShape] = useState('round');
  const [dia, setDia] = useState(200);
  const [a, setA] = useState(400);
  const [b, setB] = useState(200);
  const [segLen, setSegLen] = useState(1000);
  const [flow, setFlow] = useState(500);
  const [vmax, setVmax] = useState(5);
  const [bom, setBom] = useState([]);
  const [suggest, setSuggest] = useState(null);
  const [ready, setReady] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [segments, setSegments] = useState([]);
  const [routeMessage, setRouteMessage] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`${storageKey}:routes`) || '[]');
      if (Array.isArray(saved)) {
        stateRef.current.segments = saved;
        setSegments(saved);
        setBom(aggregateBom(saved));
      }
    } catch { /* Keep the empty editable route if saved data is invalid. */ }
  }, [storageKey]);

  useEffect(() => {
    let disposed = false;
    let renderer, scene, camera, controls, animFrame, resizeObserver;
    (() => {
      const container = containerRef.current;
      if (!container) return;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8fafc);
      scene.add(new THREE.GridHelper(10, 10, 0x2563eb, 0x334155));
      scene.add(new THREE.AxesHelper(1));
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 10, 7); scene.add(dir);

      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 360);
      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      camera.position.set(3, 3, 5); camera.lookAt(0, 0, 0);

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch {
        setRenderError('WebGL není v tomto prohlížeči dostupné. 2D náhled a výkaz materiálu zůstávají funkční.');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const metal = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.4, metalness: 0.6 });
      const joint = new THREE.MeshStandardMaterial({ color: 0x2563eb });

      const rebuild = () => {
        const toRemove = [];
        scene.traverse((c) => { if (c.isMesh) toRemove.push(c); });
        toRemove.forEach((m) => { scene.remove(m); m.geometry?.dispose(); });

        let pos = new THREE.Vector3(0, 0, 0);
        let dir3 = new THREE.Vector3(1, 0, 0);

        const bomAgg = {};
        stateRef.current.segments.forEach((seg) => {
          const spec = seg.shape === 'round' ? `ø${seg.dia}` : `${seg.a}x${seg.b}`;
          if (seg.type === 'straight') {
            const lenM = seg.length / 1000;
            let geom;
            if (seg.shape === 'round') {
              const r = (seg.dia / 2) / 1000;
              geom = new THREE.CylinderGeometry(r, r, lenM, 32);
            } else {
              const w2 = (seg.a / 1000), h2 = (seg.b / 1000);
              geom = new THREE.BoxGeometry(w2, lenM, h2);
            }
            const mesh = new THREE.Mesh(geom, metal);
            mesh.geometry.rotateX(Math.PI / 2);
            mesh.lookAt(dir3);
            mesh.position.copy(pos.clone().add(dir3.clone().multiplyScalar(lenM / 2)));
            scene.add(mesh);
            pos.add(dir3.clone().multiplyScalar(lenM));

            const key = `PIPE-${seg.shape}-${spec}`;
            const name = seg.shape === 'round' ? `Spiro Ø${seg.dia}` : `Kanál ${seg.a}×${seg.b}`;
            if (!bomAgg[key]) bomAgg[key] = { name, spec, qty: 0, unit: 'm' };
            bomAgg[key].qty += lenM;
          } else if (seg.type === 'turn') {
            let g;
            if (seg.shape === 'round') {
              g = new THREE.SphereGeometry(((seg.dia / 2) / 1000) * 1.2, 24, 24);
            } else {
              g = new THREE.BoxGeometry((seg.a / 1000) * 1.15, (seg.a / 1000) * 1.15, (seg.b / 1000) * 1.15);
            }
            const jm = new THREE.Mesh(g, joint);
            jm.position.copy(pos);
            scene.add(jm);

            if (seg.dir === 'up')     dir3.set(0, 1, 0);
            else if (seg.dir === 'down')   dir3.set(0, -1, 0);
            else {
              const angle = seg.dir === 'left' ? Math.PI / 2 : -Math.PI / 2;
              dir3.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
              dir3.x = Math.round(dir3.x); dir3.y = Math.round(dir3.y); dir3.z = Math.round(dir3.z);
            }
            const key = `BEND-${seg.shape}-${spec}`;
            const name = seg.shape === 'round' ? `Koleno Ø${seg.dia} 90°` : `Oblouk ${seg.a}×${seg.b} 90°`;
            if (!bomAgg[key]) bomAgg[key] = { name, spec, qty: 0, unit: 'ks' };
            bomAgg[key].qty += 1;
          }
        });
        const routeSpan = Math.max(1, stateRef.current.segments.reduce((sum, segment) => sum + (segment.type === 'straight' ? segment.length / 1000 : 0), 0));
        const target = pos.clone().multiplyScalar(0.5);
        controls.target.copy(target);
        camera.position.copy(target.clone().add(new THREE.Vector3(routeSpan * 0.8, routeSpan * 0.7, routeSpan * 1.2)));
        camera.far = Math.max(1000, routeSpan * 10);
        camera.updateProjectionMatrix();
        setBom(Object.values(bomAgg));
      };
      rebuildRef.current = rebuild;

      const animate = () => {
        if (disposed) return;
        animFrame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const w2 = Math.max(container.clientWidth, 320), h2 = Math.max(container.clientHeight, 360);
        renderer.setSize(w2, h2, false);
        camera.aspect = w2 / h2; camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(container);
      rebuild();
      setReady(true);
    })();
    return () => {
      disposed = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      resizeObserver?.disconnect();
      controls?.dispose();
      if (renderer) { try { renderer.dispose(); renderer.domElement.remove(); } catch {} }
    };
  }, []);

  const addStraight = () => {
    stateRef.current.segments.push({ type: 'straight', length: Number(segLen), shape, dia: Number(dia), a: Number(a), b: Number(b) });
    setSegments([...stateRef.current.segments]);
    setBom(aggregateBom(stateRef.current.segments));
    rebuildRef.current();
  };
  const addTurn = (d) => {
    stateRef.current.segments.push({ type: 'turn', dir: d, shape, dia: Number(dia), a: Number(a), b: Number(b) });
    setSegments([...stateRef.current.segments]);
    setBom(aggregateBom(stateRef.current.segments));
    rebuildRef.current();
  };
  const reset = () => { stateRef.current.segments = []; setSegments([]); setBom([]); rebuildRef.current(); };

  const saveRoute = () => {
    try {
      localStorage.setItem(`${storageKey}:routes`, JSON.stringify(segments));
      setRouteMessage('Trasa byla uložena v tomto prohlížeči.');
    } catch (error) { setRouteMessage(error.message || 'Trasu se nepodařilo uložit.'); }
  };

  const downloadBom = () => {
    const csv = ['Položka;Specifikace;Množství;Jednotka', ...bom.map((item) => `${item.name};${item.spec};${item.qty.toFixed(2)};${item.unit}`)].join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vzt-vykaz-materialu.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const runSuggest = () => {
    const r = sizeDuctForFlow({ shape, flowM3h: Number(flow), maxVelocity: Number(vmax), fixedDim: shape === 'rect' ? Number(b) : null });
    setSuggest(r);
    if (shape === 'round') setDia(r.diameterMm);
    else setA(r.widthMm);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">3D Route Builder</h3>
          <p className="text-xs text-slate-500">Skládej trasu potrubí, dopočti dimenzi a vygeneruj BOM (výpis materiálu).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShape('round')} className={`btn ${shape === 'round' ? 'btn-primary' : 'btn-ghost'}`}>Kruhové (Spiro)</button>
          <button onClick={() => setShape('rect')}  className={`btn ${shape === 'rect'  ? 'btn-primary' : 'btn-ghost'}`}>Hranaté (Kanál)</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {shape === 'round' ? (
          <label className="block text-sm">
            <span className="font-black text-slate-700">Průměr Ø (mm)</span>
            <select value={dia} onChange={(e) => setDia(Number(e.target.value))} className="input">
              {STANDARD_ROUND_DIAMETERS_MM.map((v) => <option key={v} value={v}>{`Ø ${v}`}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label className="block text-sm"><span className="font-black text-slate-700">A (mm)</span>
              <input type="number" value={a} onChange={(e) => setA(Number(e.target.value))} className="input" /></label>
            <label className="block text-sm"><span className="font-black text-slate-700">B (mm)</span>
              <input type="number" value={b} onChange={(e) => setB(Number(e.target.value))} className="input" /></label>
          </>
        )}
        <label className="block text-sm"><span className="font-black text-slate-700">Průtok (m³/h)</span>
          <input type="number" value={flow} onChange={(e) => setFlow(Number(e.target.value))} className="input" /></label>
        <label className="block text-sm"><span className="font-black text-slate-700">Max rychlost (m/s)</span>
          <input type="number" step="0.5" value={vmax} onChange={(e) => setVmax(Number(e.target.value))} className="input" /></label>
        <div className="flex items-end"><button onClick={runSuggest} className="btn btn-primary">Dopočítat dimenzi</button></div>
      </div>

      {suggest && (
        <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
          Doporučeno: {suggest.shape === 'round'
            ? <b>Ø {suggest.diameterMm} mm</b>
            : <b>{suggest.widthMm} × {suggest.heightMm} mm</b>}
          {' '}| Skutečná rychlost <b>{suggest.velocityMs} m/s</b>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div ref={containerRef} className="h-96 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase text-slate-500">Editor trasy (turtle)</p>
          <label className="mt-2 block text-sm"><span className="font-black text-slate-700">Délka úseku (mm)</span>
            <input type="number" value={segLen} step="100" onChange={(e) => setSegLen(Number(e.target.value))} className="input" /></label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={addStraight} className="btn btn-primary">➕ Rovný úsek</button>
            <button onClick={() => addTurn('left')}  className="btn btn-ghost">⬅ Vlevo</button>
            <button onClick={() => addTurn('right')} className="btn btn-ghost">➡ Vpravo</button>
            <button onClick={() => addTurn('up')}    className="btn btn-ghost">⬆ Nahoru</button>
            <button onClick={() => addTurn('down')}  className="btn btn-ghost">⬇ Dolů</button>
            <button onClick={reset} className="btn btn-danger">❌ Smazat</button>
            <button onClick={saveRoute} className="btn btn-primary">Uložit trasu</button>
            <button onClick={downloadBom} disabled={!bom.length} className="btn btn-ghost disabled:opacity-50">Stáhnout BOM CSV</button>
          </div>
          {routeMessage && <p role="status" className="mt-2 text-xs font-bold text-emerald-700">{routeMessage}</p>}

          <div className="mt-4">
            <p className="text-xs font-black uppercase text-slate-500">Výpis materiálu (BOM)</p>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-slate-500"><tr><th>Položka</th><th>Specifikace</th><th>Množství</th></tr></thead>
              <tbody>
                {(bom || []).map((it, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td>{it.name}</td><td className="font-mono text-xs">{it.spec}</td>
                    <td className="font-black">{it.qty.toFixed(2)} {it.unit}</td>
                  </tr>
                ))}
                {!bom.length && <tr><td colSpan={3} className="py-2 text-center text-slate-400">Zatím žádné položky.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!ready && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
        {renderError || '3D náhled není dostupný; editor trasy a výkaz materiálu fungují i bez něj.'}
      </div>}

      <style>{`
        .input { width: 100%; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; font-size: 0.9rem; }
        .btn { border-radius: 0.75rem; padding: 0.5rem 0.9rem; font-size: 0.85rem; font-weight: 800; }
        .btn-primary { background: #2563eb; color: white; }
        .btn-ghost { background: #f1f5f9; color: #334155; }
        .btn-danger { background: #fee2e2; color: #b91c1c; }
      `}</style>
    </section>
  );
}
