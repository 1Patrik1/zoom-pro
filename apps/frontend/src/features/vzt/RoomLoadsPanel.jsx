import { useMemo, useState } from 'react';
import { BUILDING_TYPES, ROOM_TYPES, IDA_CATEGORIES, SOLAR_GAIN_WM2 } from './constants.js';
import { requiredAirflowM3h, roomThermalLoads } from './engine.js';

// Zátěže per místnost + celkový součet — podle EN 16798-1, EN 13779, EN 12831

const EMPTY_ROOM = () => ({
  id: crypto.randomUUID(), name: 'Místnost', roomType: 'office',
  areaM2: 25, heightM: 2.7, occupants: 2, orientation: 'S', ida: 'IDA2',
});

export function RoomLoadsPanel() {
  const [buildingType, setBuildingType] = useState('office');
  const [outdoorWinterC, setOutdoorWinterC] = useState(-12);
  const [indoorC, setIndoorC] = useState(22);
  const [rooms, setRooms] = useState([EMPTY_ROOM(), { ...EMPTY_ROOM(), name: 'WC', roomType: 'wc', areaM2: 6, occupants: 0 }]);

  const update = (id, patch) => setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => setRooms((rs) => rs.filter((r) => r.id !== id));
  const add = () => setRooms((rs) => [...rs, EMPTY_ROOM()]);

  const rows = useMemo(() => rooms.map((r) => {
    const flow = requiredAirflowM3h({
      areaM2: r.areaM2, heightM: r.heightM, occupants: r.occupants,
      ida: r.ida, roomType: r.roomType, buildingType,
    });
    const load = roomThermalLoads({
      areaM2: r.areaM2, heightM: r.heightM, buildingType,
      orientation: r.orientation, outdoorWinterC, indoorC,
    });
    return { room: r, flow, load };
  }), [rooms, buildingType, outdoorWinterC, indoorC]);

  const totals = rows.reduce((acc, x) => ({
    flow: acc.flow + x.flow.designFlowM3h,
    cool: acc.cool + Number(x.load.coolingKw),
    heat: acc.heat + Number(x.load.heatingKw),
  }), { flow: 0, cool: 0, heat: 0 });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">Zátěže a průtok podle EU norem</h3>
      <p className="text-xs text-slate-500">EN 16798-1 (IEQ), EN 13779 (IDA), EN 12831 (topení).</p>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label className="block text-sm">
          <span className="font-black text-slate-700">Typ budovy</span>
          <select value={buildingType} onChange={(e) => setBuildingType(e.target.value)} className="input">
            {Object.entries(BUILDING_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-black text-slate-700">Návrhová venkovní zima (°C)</span>
          <input type="number" value={outdoorWinterC} onChange={(e) => setOutdoorWinterC(Number(e.target.value))} className="input" />
        </label>
        <label className="block text-sm">
          <span className="font-black text-slate-700">Vnitřní teplota (°C)</span>
          <input type="number" value={indoorC} onChange={(e) => setIndoorC(Number(e.target.value))} className="input" />
        </label>
        <div className="flex items-end"><button onClick={add} className="btn btn-primary">➕ Přidat místnost</button></div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th>Název</th><th>Typ</th><th>Plocha m²</th><th>Výška m</th><th>Osob</th>
              <th>Orient.</th><th>IDA</th><th>ACH</th><th>Q m³/h</th><th>Chlazení kW</th><th>Topení kW</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ room, flow, load }) => (
              <tr key={room.id} className="border-t border-slate-100 align-top">
                <td><input value={room.name} onChange={(e) => update(room.id, { name: e.target.value })} className="input-sm" /></td>
                <td>
                  <select value={room.roomType} onChange={(e) => update(room.id, { roomType: e.target.value })} className="input-sm">
                    {Object.entries(ROOM_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </td>
                <td><input type="number" value={room.areaM2} onChange={(e) => update(room.id, { areaM2: Number(e.target.value) })} className="input-sm w-20" /></td>
                <td><input type="number" step="0.1" value={room.heightM} onChange={(e) => update(room.id, { heightM: Number(e.target.value) })} className="input-sm w-16" /></td>
                <td><input type="number" value={room.occupants} onChange={(e) => update(room.id, { occupants: Number(e.target.value) })} className="input-sm w-14" /></td>
                <td>
                  <select value={room.orientation} onChange={(e) => update(room.id, { orientation: e.target.value })} className="input-sm">
                    {Object.keys(SOLAR_GAIN_WM2).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td>
                  <select value={room.ida} onChange={(e) => update(room.id, { ida: e.target.value })} className="input-sm">
                    {Object.entries(IDA_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </td>
                <td className="text-xs">{flow.achUsed}</td>
                <td className="font-black text-blue-700">{flow.designFlowM3h}</td>
                <td className="font-black text-rose-600">{load.coolingKw}</td>
                <td className="font-black text-emerald-700">{load.heatingKw}</td>
                <td><button onClick={() => remove(room.id)} className="text-xs font-black text-red-600">×</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-black">
              <td colSpan={8} className="p-2 text-right">Součet za budovu:</td>
              <td className="p-2 text-blue-700">{totals.flow.toLocaleString('cs-CZ')} m³/h</td>
              <td className="p-2 text-rose-600">{totals.cool.toFixed(2)} kW</td>
              <td className="p-2 text-emerald-700">{totals.heat.toFixed(2)} kW</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <style>{`
        .input { width: 100%; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; font-size: 0.9rem; }
        .input-sm { width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1; padding: 0.3rem 0.5rem; font-size: 0.85rem; }
        .btn { border-radius: 0.75rem; padding: 0.5rem 0.9rem; font-size: 0.85rem; font-weight: 800; }
        .btn-primary { background: #2563eb; color: white; }
      `}</style>
    </section>
  );
}
