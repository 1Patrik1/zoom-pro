import { useEffect, useRef, useState } from 'react';
import { STANDARD_ROUND_DIAMETERS_MM } from './constants.js';
import { sizeDuctForFlow } from './engine.js';

// 3D Route Builder — "turtle" v Three.js. Načítá Three přes CDN dynamickým importem,
// aby stránka nespadla ani bez třídy Three v bundleru.

async function loadThree() {
  if (typeof window === 'undefined') return null;
  if (window.__zoomProThree) return window.__zoomProThree;
  const three = await import(/* @vite-ignore */ 'https://unpkg.com/three@0.160.0/build/three.module.js');
  const oc = await import(/* @vite-ignore */ 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js');
  window.__zoomProThree = { THREE: three, OrbitControls: oc.OrbitControls };
  return window.__zoomProThree;
}

export function RouteBuilder3D() {
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

  useEffect(() => {
    let disposed = false;
    let renderer, scene, camera, controls, animFrame;
    (async () => {
      const container = containerRef.current;
      if (!container) return;
      let three;
      try { three = await loadThree(); } catch { setReady(false); return; }
      if (!three || disposed) return;
      const { THREE, OrbitControls } = three;
      setReady(true);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f172a);
      scene.add(new THREE.GridHelper(10, 10, 0x2563eb, 0x334155));
      scene.add(new THREE.AxesHelper(1));
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 10, 7); scene.add(dir);

      const w = container.clientWidth || 800;
      const h = container.clientHeight || 480;
      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
      camera.position.set(3, 3, 5); camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const metal = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.4, metalness: 0.6 });
      const joint = new THREE.MeshStandardMaterial({ color: 0x2563eb });

      const rebuild = () => {
        const toRemove = [];
        scene.traverse((c) => { if (c.isMesh) toRemove.push(c); });
        toRemove.forEach((m) => scene.remove(m));

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
        const w2 = container.clientWidth, h2 = container.clientHeight;
        renderer.setSize(w2, h2);
        camera.aspect = w2 / h2; camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);
      rebuild();
    })();
    return () => {
      disposed = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (renderer) { try { renderer.dispose(); renderer.domElement.remove(); } catch {} }
    };
  }, []);

  const addStraight = () => {
    stateRef.current.segments.push({ type: 'straight', length: Number(segLen), shape, dia: Number(dia), a: Number(a), b: Number(b) });
    rebuildRef.current();
  };
  const addTurn = (d) => {
    stateRef.current.segments.push({ type: 'turn', dir: d, shape, dia: Number(dia), a: Number(a), b: Number(b) });
    rebuildRef.current();
  };
  const reset = () => { stateRef.current.segments = []; rebuildRef.current(); };

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
        <div ref={containerRef} className="h-96 rounded-2xl border border-slate-200 bg-slate-950" />

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
          </div>

          <div className="mt-4">
            <p className="text-xs font-black uppercase text-slate-500">Výpis materiálu (BOM)</p>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-slate-500"><tr><th>Položka</th><th>Specifikace</th><th>Množství</th></tr></thead>
              <tbody>
                {bom.map((it, i) => (
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
        3D engine (Three.js) se načítá z CDN. Pokud běžíš offline, editor trasy a BOM funguje i bez 3D.
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
