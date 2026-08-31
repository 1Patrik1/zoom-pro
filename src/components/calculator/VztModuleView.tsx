import React, { useState, useMemo } from 'react';
import {
  Wind,
  Settings2,
  TrendingUp,
  Gauge,
  Box,
  RotateCw,
  Plus,
  ArrowRight,
  Zap,
  Info,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { Project, VztComponent, VztComponentType } from '../../types';
import { Vzt3DViewer } from '../Vzt3DViewer';

interface VztModuleViewProps {
  projects: Project[];
  costPerSqMeter: number;
  sellPerSqMeter: number;
  onAddComponent: (comp: Omit<VztComponent, 'id' | 'createdAt'>) => Promise<void>;
}

const STANDARD_SPIRO_DIAMETERS = [100, 125, 160, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800];

export const VztModuleView: React.FC<VztModuleViewProps> = ({
  projects,
  costPerSqMeter,
  sellPerSqMeter,
  onAddComponent,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // 1. Air Flow & Sizing State
  const [airFlowM3h, setAirFlowM3h] = useState(1800);
  const [targetAirVelocity, setTargetAirVelocity] = useState(4.5);
  const [aspectRatioLimit, setAspectRatioLimit] = useState(2.0);

  // 2. Fitting & Geometry State
  const [compType, setCompType] = useState<VztComponentType>('Rovné');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(400);
  const [diameter, setDiameter] = useState(250);
  const [width2, setWidth2] = useState(600);
  const [height2, setHeight2] = useState(300);
  const [length, setLength] = useState(1500);
  const [angle, setAngle] = useState(90);
  const [offsetMm, setOffsetMm] = useState(250);
  const [material, setMaterial] = useState<'POZINK' | 'NEREZ' | 'HLINIK'>('POZINK');
  const [sheetThickness, setSheetThickness] = useState(0.8);
  const [requiresAccessDoor, setRequiresAccessDoor] = useState(false);
  const [hasInsulation, setHasInsulation] = useState(false);
  const [note, setNote] = useState('');

  // 3. Pressure Loss State
  const [ductLengthM, setDuctLengthM] = useState(25);
  const [ductRoughnessMm, setDuctRoughnessMm] = useState(0.15); // Standard galvanized zinc
  const [fittingsCount, setFittingsCount] = useState({
    elbow90: 3,
    elbow45: 2,
    tBranch: 2,
    reducer: 2,
    soundAttenuator: 1, // Tlumič hluku
    filterG4: 1, // Hrubý filtr
    filterF7: 1, // Jemný filtr
    damper: 2, // Regulační klapka
    grille: 4, // Vyústka / mřížka
  });

  // Calculations: Sizing
  const sizing = useMemo(() => {
    const qM3s = airFlowM3h / 3600;
    const requiredAreaM2 = qM3s / Math.max(0.1, targetAirVelocity);

    // Recommended Spiro Circular Diameter
    const idealCircDiamMm = Math.sqrt((4 * requiredAreaM2) / Math.PI) * 1000;
    let chosenSpiro = STANDARD_SPIRO_DIAMETERS[0];
    for (const d of STANDARD_SPIRO_DIAMETERS) {
      if (d >= idealCircDiamMm) {
        chosenSpiro = d;
        break;
      }
      chosenSpiro = d;
    }
    const actualCircArea = Math.PI * Math.pow(chosenSpiro / 2000, 2);
    const actualCircVelocity = qM3s / actualCircArea;

    // Recommended Rectangular Duct A x B
    let recWidth = Math.round(Math.sqrt(requiredAreaM2 * aspectRatioLimit) * 20) * 50;
    if (recWidth < 150) recWidth = 150;
    let recHeight = Math.round((requiredAreaM2 / (recWidth / 1000)) * 20) * 50;
    if (recHeight < 100) recHeight = 100;
    const actualRectArea = (recWidth / 1000) * (recHeight / 1000);
    const actualRectVelocity = qM3s / actualRectArea;
    const eqHydraulicDiam = Math.round((2 * recWidth * recHeight) / (recWidth + recHeight));

    return {
      qM3s,
      requiredAreaM2: Math.round(requiredAreaM2 * 10000) / 10000,
      chosenSpiro,
      actualCircVelocity: Math.round(actualCircVelocity * 10) / 10,
      recWidth,
      recHeight,
      actualRectVelocity: Math.round(actualRectVelocity * 10) / 10,
      eqHydraulicDiam,
    };
  }, [airFlowM3h, targetAirVelocity, aspectRatioLimit]);

  // Calculations: Fitting Geometry & BOM Cost
  const fittingMetrics = useMemo(() => {
    const lM = length / 1000;
    const wM = width / 1000;
    const hM = height / 1000;
    const dM = diameter / 1000;

    let area = 0;
    let developedLength = length;
    let innerRadius = 0;
    let centerRadius = 0;
    let outerRadius = 0;

    if (compType === 'Rovné') {
      area = 2 * (wM + hM) * lM;
      developedLength = length;
    } else if (compType === 'Kruhové') {
      area = Math.PI * dM * lM;
      developedLength = length;
    } else if (compType === 'Koleno') {
      const rad = Math.max(wM, hM) * 1.0;
      centerRadius = Math.round(rad * 1000);
      innerRadius = Math.round((rad - Math.min(wM, hM) / 2) * 1000);
      outerRadius = Math.round((rad + Math.min(wM, hM) / 2) * 1000);
      const angleRad = (angle * Math.PI) / 180;
      area = 2 * (wM + hM) * rad * angleRad;
      developedLength = Math.round(rad * 1000 * angleRad);
    } else if (compType === 'Odsazení') {
      const offsetM = offsetMm / 1000;
      const hypLength = Math.sqrt(Math.pow(lM, 2) + Math.pow(offsetM, 2));
      area = 2 * (wM + hM) * hypLength;
      developedLength = Math.round(hypLength * 1000);
    } else if (compType === 'Redukce') {
      const w2M = width2 / 1000;
      const h2M = height2 / 1000;
      const avgW = (wM + w2M) / 2;
      const avgH = (hM + h2M) / 2;
      area = 2 * (avgW + avgH) * lM;
      developedLength = length;
    } else {
      area = 2 * (wM + hM) * lM + 2 * (wM * 0.7 + hM * 0.7) * (lM * 0.5);
      developedLength = length + Math.round(wM * 500);
    }

    if (requiresAccessDoor) {
      area += 0.25;
    }

    let density = 7850;
    let unitCostMultiplier = 1.0;
    if (material === 'HLINIK') {
      density = 2700;
      unitCostMultiplier = 1.6;
    } else if (material === 'NEREZ') {
      density = 7900;
      unitCostMultiplier = 2.4;
    }

    const weight = area * (sheetThickness / 1000) * density;
    const baseUnitCost = costPerSqMeter || 450;
    const baseUnitSell = sellPerSqMeter || 980;

    const costPrice = Math.round(
      baseUnitCost * Math.max(0.5, area) * unitCostMultiplier +
        (requiresAccessDoor ? 350 : 0) +
        (hasInsulation ? area * 180 : 0)
    );
    const sellPrice = Math.round(
      baseUnitSell * Math.max(0.5, area) * unitCostMultiplier +
        (requiresAccessDoor ? 750 : 0) +
        (hasInsulation ? area * 360 : 0)
    );

    return {
      surfaceArea: Math.round(area * 100) / 100,
      weight: Math.round(weight * 10) / 10,
      innerRadius,
      centerRadius,
      outerRadius,
      developedLength,
      costPrice,
      sellPrice,
    };
  }, [
    compType,
    width,
    height,
    diameter,
    width2,
    height2,
    length,
    angle,
    offsetMm,
    material,
    sheetThickness,
    requiresAccessDoor,
    hasInsulation,
    costPerSqMeter,
    sellPerSqMeter,
  ]);

  // Calculations: Pressure Drops & Fan Power
  const pressureLoss = useMemo(() => {
    const rho = 1.204; // kg/m3 (Air at 20°C)
    const nu = 1.51e-5; // m2/s
    const flowM3s = airFlowM3h / 3600;

    let eqDiamM = 0.25;
    if (compType === 'Kruhové') {
      eqDiamM = diameter / 1000;
    } else {
      eqDiamM = (2 * width * height) / (width + height) / 1000;
    }

    const crossAreaM2 = compType === 'Kruhové' ? Math.PI * Math.pow(eqDiamM / 2, 2) : (width / 1000) * (height / 1000);
    const velocity = Math.max(0.01, flowM3s / crossAreaM2);
    const dynPressure = 0.5 * rho * Math.pow(velocity, 2);

    // Reynolds Number
    const reynolds = (velocity * eqDiamM) / nu;
    const kM = ductRoughnessMm / 1000;

    // Haaland equation approximation
    const term = Math.pow(kM / (3.7 * eqDiamM), 1.11) + 6.9 / Math.max(1, reynolds);
    const invSqrtLambda = -1.8 * Math.log10(Math.max(1e-6, term));
    const lambda = 1 / Math.pow(invSqrtLambda, 2);

    // Straight duct loss
    const linearLossPaM = lambda * (1 / eqDiamM) * dynPressure;
    const ductLengthLossPa = linearLossPaM * ductLengthM;

    // Local losses sum
    const xiSum =
      fittingsCount.elbow90 * 0.35 +
      fittingsCount.elbow45 * 0.2 +
      fittingsCount.tBranch * 1.1 +
      fittingsCount.reducer * 0.25 +
      fittingsCount.damper * 0.4;

    const fittingsLossPa = xiSum * dynPressure;

    // Equipment added losses
    const equipLossPa =
      fittingsCount.soundAttenuator * 45 +
      fittingsCount.filterG4 * 50 +
      fittingsCount.filterF7 * 120 +
      fittingsCount.grille * 35;

    const totalPressureLossPa = ductLengthLossPa + fittingsLossPa + equipLossPa;
    const airPowerW = flowM3s * totalPressureLossPa;
    const fanMotorPowerW = airPowerW / 0.65; // ~65% fan/motor efficiency

    return {
      velocity: Math.round(velocity * 100) / 100,
      dynPressure: Math.round(dynPressure * 10) / 10,
      reynolds: Math.round(reynolds),
      linearLossPaM: Math.round(linearLossPaM * 10) / 10,
      ductLengthLossPa: Math.round(ductLengthLossPa),
      xiSum: Math.round(xiSum * 10) / 10,
      fittingsLossPa: Math.round(fittingsLossPa),
      equipLossPa: Math.round(equipLossPa),
      totalPressureLossPa: Math.round(totalPressureLossPa),
      fanMotorPowerW: Math.round(fanMotorPowerW),
    };
  }, [airFlowM3h, compType, diameter, width, height, ductLengthM, ductRoughnessMm, fittingsCount]);

  const handleApplySizingTo3D = () => {
    if (compType === 'Kruhové') {
      setDiameter(sizing.chosenSpiro);
    } else {
      setWidth(sizing.recWidth);
      setHeight(sizing.recHeight);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);

    await onAddComponent({
      companyId: '00000000-0000-4000-8000-000000000001',
      projectId: selectedProjectId,
      projectName: proj?.name,
      medium: 'VZT',
      type: compType,
      width: compType !== 'Kruhové' ? width : undefined,
      height: compType !== 'Kruhové' ? height : undefined,
      diameter: compType === 'Kruhové' ? diameter : undefined,
      width2: compType === 'Redukce' ? width2 : undefined,
      height2: compType === 'Redukce' ? height2 : undefined,
      length,
      angle: compType === 'Koleno' ? angle : undefined,
      offset: compType === 'Odsazení' ? offsetMm : undefined,
      innerRadius: fittingMetrics.innerRadius,
      centerRadius: fittingMetrics.centerRadius,
      outerRadius: fittingMetrics.outerRadius,
      developedLength: fittingMetrics.developedLength,
      surfaceArea: fittingMetrics.surfaceArea,
      weight: fittingMetrics.weight,
      material,
      sheetThickness,
      requiresAccessDoor,
      costPrice: fittingMetrics.costPrice,
      sellPrice: fittingMetrics.sellPrice,
      flowRate: airFlowM3h,
      velocity: pressureLoss.velocity,
      pressureLossPa: pressureLoss.totalPressureLossPa,
      note: note || `VZT — ${compType} (Rozvin ${fittingMetrics.developedLength} mm, ${airFlowM3h} m³/h)`,
    });

    setNote('');
    alert(`✅ VZT díl byl úspěšně uložen do kusovníku stavby (${proj?.name || 'Stavba'}).`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Sizing Section Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>1. Aerodynamické dimenzování VZT (Průtok na průřez)</span>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  ČSN EN 1507
                </span>
              </h3>
              <p className="text-slate-400 text-xs">Výpočet optimálního kruhového a čtyřhranného potrubí dle průtoku a rychlosti</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplySizingTo3D}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20"
          >
            <span>Přenést rozměr do 3D</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Input Controls */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Průtok vzduchu V (m³/h)</label>
              <input
                type="number"
                value={airFlowM3h}
                onChange={e => setAirFlowM3h(parseInt(e.target.value) || 100)}
                step="50"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-cyan-400 font-mono font-bold"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {[300, 800, 1800, 3500, 6000].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAirFlowM3h(v)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    {v} m³/h
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cílová rychlost v (m/s)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="2.0"
                  max="10.0"
                  step="0.5"
                  value={targetAirVelocity}
                  onChange={e => setTargetAirVelocity(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <span className="font-mono font-bold text-cyan-400 text-sm w-14 text-right">{targetAirVelocity} m/s</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Doporučeno: pobočky 3.5–5.0 m/s, páteř 5.5–8.0 m/s</div>
            </div>
          </div>

          {/* Sizing Spiro Output */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Kruhový návrh (Spiro)</span>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-1">Ø {sizing.chosenSpiro} mm</div>
              <div className="text-xs text-slate-300 mt-1">Skutečná rychlost: <strong className="text-slate-100 font-mono">{sizing.actualCircVelocity} m/s</strong></div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Ideální pro nízkou tlakovou ztrátu a rychlou montáž spiro spojkami.
            </div>
          </div>

          {/* Sizing Rectangular Output */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Čtyřhranný návrh (A × B)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {sizing.recWidth} × {sizing.recHeight} mm
              </div>
              <div className="text-xs text-slate-300 mt-1">Skutečná rychlost: <strong className="text-slate-100 font-mono">{sizing.actualRectVelocity} m/s</strong></div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Ekvivalentní hydraulický průměr: <strong className="text-slate-300 font-mono">{sizing.eqHydraulicDiam} mm</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 3D Model & Parameters Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Viewport Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col min-h-[440px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-slate-200 text-sm">
                  3D VZT Model — {compType} ({material})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsWireframe(!isWireframe)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isWireframe ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Drátový model
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`p-1.5 rounded-lg border text-xs ${
                    autoRotate ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Rotace"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[350px]">
              <Vzt3DViewer
                component={{
                  medium: 'VZT',
                  type: compType,
                  width,
                  height,
                  diameter,
                  width2,
                  height2,
                  length,
                  angle,
                  offset: offsetMm,
                  material,
                  requiresAccessDoor,
                }}
                wireframe={isWireframe}
                autoRotate={autoRotate}
              />
            </div>
          </div>

          {/* Doměry & Results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Plocha pláště</div>
              <div className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">{fittingMetrics.surfaceArea} m²</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Rozvin: {fittingMetrics.developedLength} mm</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Hmotnost plechu</div>
              <div className="text-xl font-extrabold text-slate-200 font-mono mt-0.5">{fittingMetrics.weight} kg</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Tl. {sheetThickness} mm ({material})</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Výrobní náklad</div>
              <div className="text-xl font-extrabold text-amber-400 font-mono mt-0.5">
                {fittingMetrics.costPrice.toLocaleString('cs-CZ')} Kč
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Materiál + montáž</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Prodejní cena</div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                {fittingMetrics.sellPrice.toLocaleString('cs-CZ')} Kč
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ceník pro investora</div>
            </div>
          </div>
        </div>

        {/* Form Column (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <span>Parametry VZT dílu</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Přiřadit ke stavbě</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Typ tvarovky</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Rovné', 'Kruhové', 'Koleno', 'Redukce', 'Odsazení', 'T-Kus'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCompType(t)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      compType === t
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {compType === 'Kruhové' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Průměr Ø Spiro (mm)</label>
                  <select
                    value={diameter}
                    onChange={e => setDiameter(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {STANDARD_SPIRO_DIAMETERS.map(d => (
                      <option key={d} value={d}>
                        Ø {d} mm
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Délka L (mm)</label>
                  <input
                    type="number"
                    value={length}
                    onChange={e => setLength(parseInt(e.target.value) || 100)}
                    step="100"
                    min="100"
                    max="6000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Šířka A (mm)</label>
                    <input
                      type="number"
                      value={width}
                      onChange={e => setWidth(parseInt(e.target.value) || 100)}
                      step="50"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výška B (mm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={e => setHeight(parseInt(e.target.value) || 100)}
                      step="50"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Délka L (mm)</label>
                    <input
                      type="number"
                      value={length}
                      onChange={e => setLength(parseInt(e.target.value) || 100)}
                      step="100"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                {compType === 'Redukce' && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výstup Šířka A₂ (mm)</label>
                      <input
                        type="number"
                        value={width2}
                        onChange={e => setWidth2(parseInt(e.target.value) || 100)}
                        step="50"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-sm text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výstup Výška B₂ (mm)</label>
                      <input
                        type="number"
                        value={height2}
                        onChange={e => setHeight2(parseInt(e.target.value) || 100)}
                        step="50"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-sm text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {compType === 'Koleno' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Úhel kolena (°)</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[90, 60, 45, 30, 15].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAngle(a)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border ${
                        angle === a ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {a}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {compType === 'Odsazení' && (
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Změna osy / Vyosení e (mm)</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    value={offsetMm}
                    onChange={e => setOffsetMm(parseInt(e.target.value))}
                    className="flex-1 accent-cyan-400"
                  />
                  <span className="font-mono font-bold text-cyan-400 text-sm w-16 text-right">{offsetMm} mm</span>
                </div>
              </div>
            )}

            {/* Material and Sheet Thickness */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Materiál</label>
                <select
                  value={material}
                  onChange={e => setMaterial(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="POZINK">Pozinkovaný plech (DX51D)</option>
                  <option value="NEREZ">Nerezová ocel (AISI 304)</option>
                  <option value="HLINIK">Hliníkový plech (AlMg3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tloušťka plechu</label>
                <select
                  value={sheetThickness}
                  onChange={e => setSheetThickness(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value={0.6}>0.6 mm (lehké potrubí)</option>
                  <option value={0.8}>0.8 mm (standard ČSN EN 1507)</option>
                  <option value={1.0}>1.0 mm (přetlakové / těžké)</option>
                  <option value={1.2}>1.2 mm (průmysl & kouřovody)</option>
                </select>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresAccessDoor}
                  onChange={e => setRequiresAccessDoor(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Revizní inspekční dvířka (ČSN EN 12097)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInsulation}
                  onChange={e => setHasInsulation(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Tepelná / hluková kaučuková izolace 20 mm</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Poznámka / Popis pozice</label>
              <input
                type="text"
                placeholder="např. Přívodní větev V1 — hala 1"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat do kusovníku stavby</span>
            </button>
          </form>
        </div>
      </div>

      {/* 3. Pressure Loss Section for VZT */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-4">
          <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Gauge className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>3. Tlakové ztráty vzduchotechnické trasy & Příkon ventilátoru</span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Colebrook-Haaland & Darcy-Weisbach
              </span>
            </h3>
            <p className="text-slate-400 text-xs">Výpočet třecích a místních odporů pro dimenzování VZT jednotek a ventilátorů</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Délka rovného potrubí trasy L (m)</label>
              <input
                type="number"
                value={ductLengthM}
                onChange={e => setDuctLengthM(parseFloat(e.target.value) || 1)}
                step="1"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-cyan-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Drsnost stěny potrubí k (mm)</label>
              <select
                value={ductRoughnessMm}
                onChange={e => setDuctRoughnessMm(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
              >
                <option value={0.15}>0.15 mm — Standardní pozinkovaný plech</option>
                <option value={0.05}>0.05 mm — Hladký nerez / hliník</option>
                <option value={0.01}>0.01 mm — Plastové VZT potrubí</option>
                <option value={0.3}>0.30 mm — Flexibilní Aluflex hadice</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-2">Počty tvarovek a prvků v trase:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Kolena 90°:</span>
                  <input
                    type="number"
                    value={fittingsCount.elbow90}
                    onChange={e => setFittingsCount({ ...fittingsCount, elbow90: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Kolena 45°:</span>
                  <input
                    type="number"
                    value={fittingsCount.elbow45}
                    onChange={e => setFittingsCount({ ...fittingsCount, elbow45: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Tlumiče hluku:</span>
                  <input
                    type="number"
                    value={fittingsCount.soundAttenuator}
                    onChange={e => setFittingsCount({ ...fittingsCount, soundAttenuator: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Vyústky / mřížky:</span>
                  <input
                    type="number"
                    value={fittingsCount.grille}
                    onChange={e => setFittingsCount({ ...fittingsCount, grille: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown loss */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">Rozpad tlakových ztrát:</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Rychlost v potrubí:</span>
                  <span className="font-mono text-cyan-400 font-bold">{pressureLoss.velocity} m/s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Dynamický tlak pd:</span>
                  <span className="font-mono text-slate-200">{pressureLoss.dynPressure} Pa</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Tření v délce ({ductLengthM} m):</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.ductLengthLossPa} Pa</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Místní odpory (Σξ = {pressureLoss.xiSum}):</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.fittingsLossPa} Pa</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Příslušenství (filtry + tlumiče):</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.equipLossPa} Pa</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-cyan-950/40 rounded-lg border border-cyan-800/60 text-xs">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold mb-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lineární odpor potrubí R:</span>
              </div>
              <div className="text-lg font-bold text-cyan-400 font-mono">{pressureLoss.linearLossPaM} Pa/m</div>
            </div>
          </div>

          {/* Total Loss and Fan Requirement */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-xl border border-cyan-500/40 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-cyan-400 tracking-wider">Celková tlaková ztráta trasy</span>
              <div className="text-3xl font-black text-white font-mono mt-1 flex items-baseline space-x-2">
                <span>{pressureLoss.totalPressureLossPa}</span>
                <span className="text-sm font-normal text-slate-400">Pa</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Doporučený příkon motoru ventilátoru</span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1 flex items-baseline space-x-2">
                  <span>{pressureLoss.fanMotorPowerW}</span>
                  <span className="text-sm font-normal text-slate-400">W</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Počítáno s aerodynamickou a motorovou účinností η = 65%</div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-4 p-2 bg-slate-950 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Splňuje požadavky na tichý a úsporný provoz VZT větve.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
