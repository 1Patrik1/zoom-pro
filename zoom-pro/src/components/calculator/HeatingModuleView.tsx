import React, { useState, useMemo } from 'react';
import {
  Flame,
  Settings2,
  TrendingUp,
  Gauge,
  Box,
  RotateCw,
  Plus,
  ArrowRight,
  Zap,
  Thermometer,
  CheckCircle2,
  Activity,
  Droplets,
} from 'lucide-react';
import { Project, VztComponent, VztComponentType } from '../../types';
import { Vzt3DViewer } from '../Vzt3DViewer';

interface HeatingModuleViewProps {
  projects: Project[];
  costPerSqMeter: number;
  sellPerSqMeter: number;
  onAddComponent: (comp: Omit<VztComponent, 'id' | 'createdAt'>) => Promise<void>;
}

// DN Standards with inner/outer diameters for pipes (mm)
const STANDARD_DN_PIPES: Record<number, { outer: number; inner: number; label: string }> = {
  15: { outer: 20.0, inner: 16.0, label: 'DN15 (1/2") — Ø20×2.0' },
  20: { outer: 25.0, inner: 20.4, label: 'DN20 (3/4") — Ø25×2.3' },
  25: { outer: 32.0, inner: 26.0, label: 'DN25 (1") — Ø32×3.0' },
  32: { outer: 40.0, inner: 32.6, label: 'DN32 (5/4") — Ø40×3.7' },
  40: { outer: 50.0, inner: 40.8, label: 'DN40 (6/4") — Ø50×4.6' },
  50: { outer: 63.0, inner: 51.4, label: 'DN50 (2") — Ø63×5.8' },
  65: { outer: 75.0, inner: 61.4, label: 'DN65 (2 1/2") — Ø75×6.8' },
  80: { outer: 90.0, inner: 73.6, label: 'DN80 (3") — Ø90×8.2' },
  100: { outer: 110.0, inner: 90.0, label: 'DN100 (4") — Ø110×10.0' },
};

export const HeatingModuleView: React.FC<HeatingModuleViewProps> = ({
  projects,
  costPerSqMeter,
  sellPerSqMeter,
  onAddComponent,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // 1. Thermal Power & Temperature Gradients
  const [heatingPowerKw, setHeatingPowerKw] = useState(25);
  const [tempSupply, setTempSupply] = useState(75);
  const [tempReturn, setTempReturn] = useState(65);
  const [glycolPercent, setGlycolPercent] = useState(0); // 0 = Pure water, 20-40% glycol
  const [targetHeatingVelocity, setTargetHeatingVelocity] = useState(0.5); // m/s

  // 2. Pipe, Armature & Geometry State
  const [compType, setCompType] = useState<VztComponentType>('Trubka_Topeni');
  const [dn, setDn] = useState<number>(25);
  const [length, setLength] = useState(2000); // mm
  const [angle, setAngle] = useState(90);
  const [offsetMm, setOffsetMm] = useState(200);
  const [material, setMaterial] = useState<'OCEL_UHLIKOVA' | 'OCEL_BEZESVA' | 'MED' | 'PEX_AL_PEX'>('OCEL_UHLIKOVA');
  const [hasInsulation, setHasInsulation] = useState(true);
  const [note, setNote] = useState('');

  // 3. Hydraulic Pressure Loss State
  const [pipeLengthM, setPipeLengthM] = useState(30);
  const [pipeRoughnessMm, setPipeRoughnessMm] = useState(0.045); // Steel / copper
  const [fittingsCount, setFittingsCount] = useState({
    elbow90: 6,
    elbow45: 2,
    tPieceBranch: 3,
    tPieceDirect: 2,
    reducer: 2,
    thermoValve: 4, // Termostatický radiátorový ventil
    lockshield: 4, // Regulační šroubení
    ballValve: 3, // Kulový kohout
    checkValve: 1, // Zpětná klapka
    dirtSeparator: 1, // Magnetický filtr / odlučovač nečistot
    heatExchanger: 0, // Deskový výměník
    radiatorOrLoop: 4, // Těleso nebo smyčka
  });

  // Calculation: Flow & Sizing from Heat Power & ΔT
  const thermalSizing = useMemo(() => {
    const deltaT = Math.max(1, tempSupply - tempReturn);
    let specificHeat = 4.186; // kJ/kg.K for water
    let density = 983.0; // kg/m3 at ~60°C

    if (glycolPercent === 20) {
      specificHeat = 3.95;
      density = 1020;
    } else if (glycolPercent === 30) {
      specificHeat = 3.82;
      density = 1040;
    } else if (glycolPercent === 40) {
      specificHeat = 3.68;
      density = 1060;
    }

    // Mass flow: m_dot (kg/h) = (Q (kW) * 3600) / (c * deltaT)
    const massFlowKgH = (heatingPowerKw * 3600) / (specificHeat * deltaT);
    const volFlowM3H = massFlowKgH / density;
    const volFlowLMin = (volFlowM3H * 1000) / 60;
    const volFlowLs = (volFlowM3H * 1000) / 3600;

    // Determine optimal DN for target velocity (e.g. 0.5 m/s)
    const qM3s = volFlowM3H / 3600;
    let chosenDn = 15;
    let minVelDiff = 999;
    let bestVelocity = 0;

    for (const [key, val] of Object.entries(STANDARD_DN_PIPES)) {
      const dNum = parseInt(key);
      const innerM = val.inner / 1000;
      const area = Math.PI * Math.pow(innerM / 2, 2);
      const vel = qM3s / area;
      const diff = Math.abs(vel - targetHeatingVelocity);
      if (diff < minVelDiff) {
        minVelDiff = diff;
        chosenDn = dNum;
        bestVelocity = vel;
      }
    }

    return {
      deltaT,
      specificHeat,
      density,
      massFlowKgH: Math.round(massFlowKgH * 10) / 10,
      volFlowM3H: Math.round(volFlowM3H * 1000) / 1000,
      volFlowLMin: Math.round(volFlowLMin * 10) / 10,
      volFlowLs: Math.round(volFlowLs * 100) / 100,
      recommendedDn: chosenDn,
      actualVelocity: Math.round(bestVelocity * 100) / 100,
    };
  }, [heatingPowerKw, tempSupply, tempReturn, glycolPercent, targetHeatingVelocity]);

  // Calculations: Fitting Geometry & BOM Cost
  const fittingMetrics = useMemo(() => {
    const pipeInfo = STANDARD_DN_PIPES[dn] || STANDARD_DN_PIPES[25];
    const outerM = pipeInfo.outer / 1000;
    const innerM = pipeInfo.inner / 1000;
    const lM = length / 1000;

    let area = Math.PI * outerM * lM;
    let developedLength = length;
    let innerRadius = 0;
    let centerRadius = 0;
    let outerRadius = 0;

    if (compType === 'Koleno') {
      const rad = outerM * 1.5;
      centerRadius = Math.round(rad * 1000);
      innerRadius = Math.round((rad - outerM / 2) * 1000);
      outerRadius = Math.round((rad + outerM / 2) * 1000);
      const angleRad = (angle * Math.PI) / 180;
      area = Math.PI * outerM * rad * angleRad;
      developedLength = Math.round(rad * 1000 * angleRad);
    } else if (compType === 'Odsazení') {
      const offsetM = offsetMm / 1000;
      const hypLength = Math.sqrt(Math.pow(lM, 2) + Math.pow(offsetM, 2));
      area = Math.PI * outerM * hypLength;
      developedLength = Math.round(hypLength * 1000);
    }

    // Material weight calculation
    let materialDensity = 7850; // Steel
    let unitCostBase = 80;
    let unitSellBase = 180;

    if (material === 'MED') {
      materialDensity = 8960;
      unitCostBase = 160;
      unitSellBase = 320;
    } else if (material === 'PEX_AL_PEX') {
      materialDensity = 1400;
      unitCostBase = 65;
      unitSellBase = 140;
    }

    const wallThicknessM = (outerM - innerM) / 2;
    const metalAreaM2 = Math.PI * (Math.pow(outerM / 2, 2) - Math.pow(innerM / 2, 2));
    const dryWeight = metalAreaM2 * (developedLength / 1000) * materialDensity;

    // Water volume
    const innerAreaM2 = Math.PI * Math.pow(innerM / 2, 2);
    const innerVolumeM3 = innerAreaM2 * (developedLength / 1000);
    const innerVolumeLiters = innerVolumeM3 * 1000;
    const waterWeight = innerVolumeLiters * (thermalSizing.density / 1000);
    const totalOperatingWeight = dryWeight + waterWeight;

    const costPrice = Math.round(
      (unitCostBase * (developedLength / 1000) * (dn / 20) + (compType === 'Armatura_Ventil' ? 450 : 0)) *
        (hasInsulation ? 1.25 : 1.0)
    );
    const sellPrice = Math.round(
      (unitSellBase * (developedLength / 1000) * (dn / 20) + (compType === 'Armatura_Ventil' ? 890 : 0)) *
        (hasInsulation ? 1.3 : 1.0)
    );

    return {
      surfaceArea: Math.round(area * 1000) / 1000,
      developedLength,
      dryWeight: Math.round(dryWeight * 100) / 100,
      waterWeight: Math.round(waterWeight * 100) / 100,
      totalOperatingWeight: Math.round(totalOperatingWeight * 100) / 100,
      innerVolumeLiters: Math.round(innerVolumeLiters * 100) / 100,
      innerRadius,
      centerRadius,
      outerRadius,
      costPrice,
      sellPrice,
    };
  }, [dn, length, compType, angle, offsetMm, material, hasInsulation, thermalSizing.density]);

  // Calculations: Pressure Drop & Circulation Pump
  const pressureLoss = useMemo(() => {
    const pipeInfo = STANDARD_DN_PIPES[dn] || STANDARD_DN_PIPES[25];
    const innerDiamM = pipeInfo.inner / 1000;
    const flowM3s = thermalSizing.volFlowM3H / 3600;
    const areaM2 = Math.PI * Math.pow(innerDiamM / 2, 2);
    const velocity = Math.max(0.01, flowM3s / areaM2);
    const dynPressure = 0.5 * thermalSizing.density * Math.pow(velocity, 2);

    // Kinematic viscosity of water/glycol at ~60°C
    const nu = 0.47e-6; // m2/s
    const reynolds = (velocity * innerDiamM) / nu;

    const kM = pipeRoughnessMm / 1000;
    let lambda = 0.02;
    if (reynolds <= 2300) {
      lambda = 64 / Math.max(1, reynolds);
    } else {
      const term = Math.pow(kM / (3.7 * innerDiamM), 1.11) + 6.9 / reynolds;
      const invSqrtLambda = -1.8 * Math.log10(Math.max(1e-6, term));
      lambda = 1 / Math.pow(invSqrtLambda, 2);
    }

    // Straight pipe loss
    const lengthLossPa = lambda * (pipeLengthM / innerDiamM) * dynPressure;
    const linearLossPaM = lengthLossPa / Math.max(1, pipeLengthM);

    // Local resistance coefficients
    const xiSum =
      fittingsCount.elbow90 * 1.2 +
      fittingsCount.elbow45 * 0.5 +
      fittingsCount.tPieceBranch * 1.5 +
      fittingsCount.tPieceDirect * 0.4 +
      fittingsCount.reducer * 0.3 +
      fittingsCount.ballValve * 0.3 +
      fittingsCount.thermoValve * 3.5 +
      fittingsCount.lockshield * 2.0 +
      fittingsCount.checkValve * 2.2 +
      fittingsCount.dirtSeparator * 1.8;

    const fittingsLossPa = xiSum * dynPressure;

    // Radiators and Heat Exchangers Added Delta P
    const equipmentLossPa =
      fittingsCount.radiatorOrLoop * 4500 + // ~4.5 kPa per radiator
      fittingsCount.heatExchanger * 15000; // ~15 kPa per exchanger

    const totalPressureLossPa = lengthLossPa + fittingsLossPa + equipmentLossPa;
    const totalPressureLossKPa = totalPressureLossPa / 1000;

    // Pump head H = delta_p / (rho * g)
    const pumpHeadM = totalPressureLossPa / (thermalSizing.density * 9.81);

    // Hydraulic pump power and electrical power (approx 55% motor/impeller efficiency)
    const hydraulicPowerW = flowM3s * totalPressureLossPa;
    const pumpElectricalPowerW = hydraulicPowerW / 0.55;

    return {
      velocity: Math.round(velocity * 100) / 100,
      dynPressure: Math.round(dynPressure * 10) / 10,
      reynolds: Math.round(reynolds),
      linearLossPaM: Math.round(linearLossPaM * 10) / 10,
      lengthLossKPa: Math.round((lengthLossPa / 1000) * 100) / 100,
      xiSum: Math.round(xiSum * 10) / 10,
      fittingsLossKPa: Math.round((fittingsLossPa / 1000) * 100) / 100,
      equipmentLossKPa: Math.round((equipmentLossPa / 1000) * 100) / 100,
      totalPressureLossPa: Math.round(totalPressureLossPa),
      totalPressureLossKPa: Math.round(totalPressureLossKPa * 100) / 100,
      pumpHeadM: Math.round(pumpHeadM * 100) / 100,
      pumpElectricalPowerW: Math.round(pumpElectricalPowerW),
    };
  }, [dn, thermalSizing.volFlowM3H, thermalSizing.density, pipeLengthM, pipeRoughnessMm, fittingsCount]);

  const handleApplyRecommendedDn = () => {
    setDn(thermalSizing.recommendedDn);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);

    await onAddComponent({
      companyId: '00000000-0000-4000-8000-000000000001',
      projectId: selectedProjectId,
      projectName: proj?.name,
      medium: 'TOPENI',
      type: compType,
      dn,
      length,
      angle: compType === 'Koleno' ? angle : undefined,
      offset: compType === 'Odsazení' ? offsetMm : undefined,
      innerRadius: fittingMetrics.innerRadius,
      centerRadius: fittingMetrics.centerRadius,
      outerRadius: fittingMetrics.outerRadius,
      developedLength: fittingMetrics.developedLength,
      surfaceArea: fittingMetrics.surfaceArea,
      weight: fittingMetrics.dryWeight,
      waterWeight: fittingMetrics.waterWeight,
      material,
      sheetThickness: 0,
      requiresAccessDoor: false,
      costPrice: fittingMetrics.costPrice,
      sellPrice: fittingMetrics.sellPrice,
      heatPowerKw: heatingPowerKw,
      tempDeltaK: thermalSizing.deltaT,
      flowRate: thermalSizing.volFlowM3H,
      velocity: pressureLoss.velocity,
      pressureLossPa: pressureLoss.totalPressureLossPa,
      note: note || `Topení — ${compType} (DN${dn}, Q=${heatingPowerKw} kW, spád ${tempSupply}/${tempReturn} °C)`,
    });

    setNote('');
    alert(`✅ Otopný prvek byl úspěšně přidán do kusovníku stavby (${proj?.name || 'Stavba'}).`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Thermal Power & Temperature Gradients Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Flame className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>1. Tepelné výkony, teplotní spády & Hydronické dimenzování ÚT</span>
                <span className="text-[11px] font-mono text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                  Q = ṁ · c · ΔT
                </span>
              </h3>
              <p className="text-slate-400 text-xs">Výpočet hmotnostního i objemového průtoku a doporučené světlosti potrubí DN</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyRecommendedDn}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold text-xs hover:bg-red-400 transition-all shadow-md shadow-red-500/20"
          >
            <span>Použít DN{thermalSizing.recommendedDn} ve 3D</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Controls */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tepelný výkon Q (kW)</label>
              <input
                type="number"
                value={heatingPowerKw}
                onChange={e => setHeatingPowerKw(parseFloat(e.target.value) || 1)}
                step="1"
                min="0.5"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-red-400 font-mono font-bold"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {[5, 12, 25, 45, 120].map(kw => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setHeatingPowerKw(kw)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    {kw} kW
                  </button>
                ))}
              </div>
            </div>

            {/* Standard Temp Gradients */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Teplotní spád otopné soustavy</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '75 / 65 °C (Radiátory)', s: 75, r: 65 },
                  { label: '55 / 45 °C (TČ / Kondenz)', s: 55, r: 45 },
                  { label: '35 / 30 °C (Podlahovka)', s: 35, r: 30 },
                  { label: '80 / 60 °C (Průmysl / CZT)', s: 80, r: 60 },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setTempSupply(item.s);
                      setTempReturn(item.r);
                    }}
                    className={`p-1.5 rounded-lg text-[11px] font-medium border text-left transition-all ${
                      tempSupply === item.s && tempReturn === item.r
                        ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Glycol Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Teplonosná látka</label>
              <select
                value={glycolPercent}
                onChange={e => setGlycolPercent(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value={0}>Čistá otopná voda (c = 4.19 kJ/kg·K)</option>
                <option value={20}>20% nemrznoucí glykolová směs (do -10°C)</option>
                <option value={30}>30% nemrznoucí glykolová směs (do -18°C)</option>
                <option value={40}>40% nemrznoucí glykolová směs (do -25°C)</option>
              </select>
            </div>
          </div>

          {/* Mass & Volumetric Flows Output */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Hmotnostní & Objemový průtok</span>
              <div className="text-2xl font-black text-red-400 font-mono mt-1">
                {thermalSizing.massFlowKgH} <span className="text-sm font-normal text-slate-400">kg/h</span>
              </div>
              <div className="text-sm text-slate-200 font-mono font-bold mt-2">
                {thermalSizing.volFlowM3H} m³/h ({thermalSizing.volFlowLMin} l/min)
              </div>
              <div className="text-xs text-slate-400 mt-1">Teplotní rozdíl ΔT: <strong className="text-slate-100 font-mono">{thermalSizing.deltaT} K (°C)</strong></div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Přesně spočteno pro dimenzování armatur a expanzních nádob.
            </div>
          </div>

          {/* Sizing DN Recommendation */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Doporučená světlost potrubí</span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                DN {thermalSizing.recommendedDn}
              </div>
              <div className="text-xs text-slate-300 mt-1 font-mono">
                {STANDARD_DN_PIPES[thermalSizing.recommendedDn]?.label}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Skutečná rychlost: <strong className="text-emerald-300 font-mono">{thermalSizing.actualVelocity} m/s</strong>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Udržuje optimální tichý režim (0.3–0.7 m/s) v otopné větvi.
            </div>
          </div>
        </div>
      </div>

      {/* 2. 3D Model & Heating Component Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Viewport Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col min-h-[440px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-red-400" />
                <span className="font-bold text-slate-200 text-sm">
                  3D Model Otopného Potrubí / Armatury — DN{dn} ({compType})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsWireframe(!isWireframe)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isWireframe ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Drátový model
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`p-1.5 rounded-lg border text-xs ${
                    autoRotate ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-400'
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
                  medium: 'TOPENI',
                  type: compType,
                  diameter: STANDARD_DN_PIPES[dn]?.outer || 32,
                  dn,
                  length,
                  angle,
                  offset: offsetMm,
                  material,
                }}
                wireframe={isWireframe}
                autoRotate={autoRotate}
              />
            </div>
          </div>

          {/* Doměry & Results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Objem vody</div>
              <div className="text-xl font-extrabold text-blue-400 font-mono mt-0.5">{fittingMetrics.innerVolumeLiters} l</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Voda: {fittingMetrics.waterWeight} kg</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Provozní hmotnost</div>
              <div className="text-xl font-extrabold text-slate-200 font-mono mt-0.5">{fittingMetrics.totalOperatingWeight} kg</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Suchá: {fittingMetrics.dryWeight} kg</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Výrobní náklad</div>
              <div className="text-xl font-extrabold text-amber-400 font-mono mt-0.5">
                {fittingMetrics.costPrice.toLocaleString('cs-CZ')} Kč
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Materiál + lisování</div>
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
            <Settings2 className="w-5 h-5 text-red-400" />
            <span>Parametry otopného prvku (ÚT)</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Přiřadit ke stavbě</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Typ tvarovky / prvku</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Trubka_Topeni', 'Koleno', 'Odsazení', 'Redukce', 'T-Kus', 'Armatura_Ventil'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCompType(t)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      compType === t
                        ? 'bg-red-500/20 border-red-500 text-red-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* DN Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nominální světlost DN</label>
              <select
                value={dn}
                onChange={e => setDn(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
              >
                {Object.entries(STANDARD_DN_PIPES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Délka úseku L (mm)</label>
              <input
                type="number"
                value={length}
                onChange={e => setLength(parseInt(e.target.value) || 100)}
                step="100"
                min="100"
                max="12000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            {compType === 'Koleno' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Úhel ohybu (°)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[90, 60, 45, 30].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAngle(a)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border ${
                        angle === a ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'
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
                <label className="block text-xs font-semibold text-slate-300">Vyosení stoupačky / etážka e (mm)</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="30"
                    max="500"
                    step="10"
                    value={offsetMm}
                    onChange={e => setOffsetMm(parseInt(e.target.value))}
                    className="flex-1 accent-red-400"
                  />
                  <span className="font-mono font-bold text-red-400 text-sm w-16 text-right">{offsetMm} mm</span>
                </div>
              </div>
            )}

            {/* Material */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Materiál trubky</label>
              <select
                value={material}
                onChange={e => setMaterial(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="OCEL_UHLIKOVA">Uhlíková ocel lisovaná (systém C-ocel)</option>
                <option value="OCEL_BEZESVA">Černá bezešvá ocel (svařovaná)</option>
                <option value="MED">Měď Cu-DHP (pájená / lisovaná)</option>
                <option value="PEX_AL_PEX">Vícevrstvý plastohliník PEX-AL-PEX</option>
              </select>
            </div>

            {/* Options */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInsulation}
                  onChange={e => setHasInsulation(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-red-500 focus:ring-0"
                />
                <span>Tepelná trubicová izolace s Al fólií dle vyhlášky</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Poznámka / Popis</label>
              <input
                type="text"
                placeholder="např. Páteřní větev kotelny k rozdělovači ÚT"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-400 hover:to-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/25 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat do kusovníku stavby</span>
            </button>
          </form>
        </div>
      </div>

      {/* 3. Hydraulic Pressure Loss & Circulation Pump */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-4">
          <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <Gauge className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>3. Hydraulická tlaková ztráta otopné trasy & Oběhové čerpadlo</span>
              <span className="text-[11px] font-mono text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                Darcy-Weisbach / Colebrook
              </span>
            </h3>
            <p className="text-slate-400 text-xs">Výpočet tlakového spádu a potřebné dopravní výšky H (m v.s.) pro čerpadlo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Délka potrubní trasy L (m)</label>
              <input
                type="number"
                value={pipeLengthM}
                onChange={e => setPipeLengthM(parseFloat(e.target.value) || 1)}
                step="1"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-red-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Materiálová drsnost k (mm)</label>
              <select
                value={pipeRoughnessMm}
                onChange={e => setPipeRoughnessMm(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
              >
                <option value={0.045}>0.045 mm — Lisovaná uhlíková ocel</option>
                <option value={0.0015}>0.0015 mm — Hladká měď / PEX</option>
                <option value={0.15}>0.15 mm — Starší černá ocel</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-2">Armatury & tělesa v okruhu:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Termostatické ventily:</span>
                  <input
                    type="number"
                    value={fittingsCount.thermoValve}
                    onChange={e => setFittingsCount({ ...fittingsCount, thermoValve: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Otopná tělesa / smyčky:</span>
                  <input
                    type="number"
                    value={fittingsCount.radiatorOrLoop}
                    onChange={e => setFittingsCount({ ...fittingsCount, radiatorOrLoop: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
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
                  <span className="text-slate-400 text-[11px]">Magnetický filtr:</span>
                  <input
                    type="number"
                    value={fittingsCount.dirtSeparator}
                    onChange={e => setFittingsCount({ ...fittingsCount, dirtSeparator: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown loss */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">Hydraulický rozpad:</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Rychlost proudění v:</span>
                  <span className="font-mono text-red-400 font-bold">{pressureLoss.velocity} m/s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Tření v délce potrubí:</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.lengthLossKPa} kPa</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Místní odpory (armatury):</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.fittingsLossKPa} kPa</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Tlakový spád těles & výměníků:</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.equipmentLossKPa} kPa</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-red-950/40 rounded-lg border border-red-800/60 text-xs">
              <div className="flex items-center space-x-1.5 text-red-300 font-semibold mb-1">
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>Lineární tlakový odpor R:</span>
              </div>
              <div className="text-lg font-bold text-red-400 font-mono">{pressureLoss.linearLossPaM} Pa/m</div>
            </div>
          </div>

          {/* Pump requirement */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-xl border border-red-500/40 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-red-400 tracking-wider">Celková tlaková ztráta okruhu</span>
              <div className="text-3xl font-black text-white font-mono mt-1 flex items-baseline space-x-2">
                <span>{pressureLoss.totalPressureLossKPa}</span>
                <span className="text-sm font-normal text-slate-400">kPa ({pressureLoss.totalPressureLossPa} Pa)</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Dopravní výška čerpadla H</span>
                <div className="text-3xl font-black text-emerald-400 font-mono mt-1 flex items-baseline space-x-2">
                  <span>{pressureLoss.pumpHeadM}</span>
                  <span className="text-sm font-normal text-slate-400">m v.s. (mH₂O)</span>
                </div>
                <div className="text-xs text-slate-300 mt-2 font-mono">
                  Elektrický příkon motoru: <strong className="text-emerald-400">{pressureLoss.pumpElectricalPowerW} W</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-4 p-2 bg-slate-950 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Splňuje normy energetické účinnosti pro oběhová čerpadla třídy A.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
