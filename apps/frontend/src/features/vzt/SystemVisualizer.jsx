import { useMemo, useRef, useState } from 'react';
import { requiredAirflowM3h, roomThermalLoads } from './engine.js';

const LAYERS = [
  { id: 'vzt', label: 'VZT', color: '#2563eb' },
  { id: 'heating', label: 'Topení', color: '#dc2626' },
  { id: 'water', label: 'Voda', color: '#0891b2' }
];

export function SystemVisualizer({ rooms, buildingType, outdoorWinterC, indoorC, visible, onVisibilityChange, onSave }) {
  const [visibleMessage, setVisibleMessage] = useState('');
  const svgRef = useRef(null);
  const layouts = useMemo(() => (rooms || []).map((room) => ({
    room,
    airflow: requiredAirflowM3h({ ...room, buildingType }),
    thermal: roomThermalLoads({ ...room, buildingType, outdoorWinterC, indoorC })
  })), [rooms, buildingType, outdoorWinterC, indoorC]);
  const columns = Math.max(1, Math.min(3, layouts.length));
  const rows = Math.max(1, Math.ceil(layouts.length / columns));
  const width = columns * 280 + 40;
  const height = rows * 205 + 40;

  function downloadSvg() {
    if (!svgRef.current) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgRef.current)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schema-technickych-systemu.svg';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function save() {
    const stored = onSave(visible);
    setVisibleMessage(stored === false ? 'Uložení selhalo; ověřte dostupné místo v prohlížeči.' : 'Návrh místností a zobrazené vrstvy byly uloženy v tomto prohlížeči.');
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">Společná vizualizace systému</h3>
          <p className="mt-1 text-xs text-slate-500">Schemata VZT, topení a vody se odvozují ze stejných místností a zátěží výše.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LAYERS.map((layer) => (
            <button key={layer.id} type="button" aria-pressed={visible[layer.id]} onClick={() => onVisibilityChange((current) => ({ ...current, [layer.id]: !current[layer.id] }))}
              className={`rounded-xl border px-3 py-2 text-xs font-black ${visible[layer.id] ? 'text-white' : 'bg-white text-slate-500'}`}
              style={visible[layer.id] ? { backgroundColor: layer.color, borderColor: layer.color } : { borderColor: '#cbd5e1' }}>
              {visible[layer.id] ? '✓ ' : ''}{layer.label}
            </button>
          ))}
          <button type="button" onClick={downloadSvg} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700">Stáhnout SVG</button>
          <button type="button" onClick={save} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Uložit návrh</button>
        </div>
      </div>

      {visibleMessage && <p role="status" className="mt-3 text-xs font-bold text-emerald-700">{visibleMessage}</p>}
      {!layouts.length ? <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Přidejte místnost v panelu zátěží a její rozvody se zde zobrazí.</div> : (
        <div className="mt-4 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Půdorysné schéma VZT, topení a vody" className="block min-w-[560px]" style={{ width: '100%', height: 'auto' }}>
            <rect width={width} height={height} fill="#f8fafc" />
            {layouts.map(({ room, airflow, thermal }, index) => {
              const col = index % columns;
              const row = Math.floor(index / columns);
              const x = 20 + col * 280;
              const y = 20 + row * 205;
              return (
                <g key={room.id}>
                  <rect x={x} y={y} width="250" height="175" rx="8" fill="white" stroke="#94a3b8" strokeWidth="2" />
                  <text x={x + 12} y={y + 22} fill="#0f172a" fontSize="13" fontWeight="700">{room.name || `Místnost ${index + 1}`}</text>
                  <text x={x + 12} y={y + 40} fill="#64748b" fontSize="10">{room.areaM2} m² · Q {airflow.designFlowM3h} m³/h · topení {thermal.heatingKw} kW</text>
                  {visible.vzt && <g fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round">
                    <path d={`M ${x + 35} ${y + 65} H ${x + 215} M ${x + 125} ${y + 65} V ${y + 111}`} />
                    <circle cx={x + 125} cy={y + 116} r="8" fill="#dbeafe" />
                  </g>}
                  {visible.heating && <g fill="none" stroke="#dc2626" strokeWidth="4" strokeLinecap="round">
                    <path d={`M ${x + 25} ${y + 148} H ${x + 225}`} />
                    <path d={`M ${x + 185} ${y + 148} v-25 h8 v25 m8 0 v-25 h8 v25`} />
                  </g>}
                  {visible.water && <g fill="none" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" strokeDasharray="7 5">
                    <path d={`M ${x + 32} ${y + 91} H ${x + 76} V ${y + 132} H ${x + 96}`} />
                    <circle cx={x + 99} cy={y + 132} r="5" fill="#cffafe" />
                  </g>}
                </g>
              );
            })}
            <g fontSize="11" fontWeight="700">
              <text x="24" y={height - 10} fill="#2563eb">VZT · modrá</text>
              <text x="125" y={height - 10} fill="#dc2626">Topení · červená</text>
              <text x="255" y={height - 10} fill="#0891b2">Voda · tyrkysová</text>
            </g>
          </svg>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Jde o orientační schéma podle místností, ne o prováděcí výkres. Výpočty dimenzí a tlakových ztrát jsou v samostatných panelech.</p>
    </section>
  );
}
