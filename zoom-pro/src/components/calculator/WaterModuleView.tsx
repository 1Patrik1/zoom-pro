import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Settings2,
  TrendingUp,
  Gauge,
  Box,
  RotateCw,
  Plus,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { Project, VztComponent, VztComponentType } from '../../types';
import { Vzt3DViewer } from '../Vzt3DViewer';

interface WaterModuleViewProps {
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

export const WaterModuleView: React.FC<WaterModuleViewProps> = ({
  projects,
  costPerSqMeter,
  sellPerSqMeter,
  onAddComponent,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // 1. Fixtures & Design Flow according to ČSN 75 5455
  const [flowMode, setFlowMode] = useState<'FIXTURES' | 'MANUAL'>('FIXTURES');
  const [manualFlowLs, setManualFlowLs] = useState(1.2);
  const [fixtures, setFixtures] = useState({
    washbasin: 3, // 0.1 l/s
    wc: 2, // 0.1 l/s
    shower: 2, // 0.2 l/s
    sink: 2, // 0.2 l/s
    bathtub: 1, // 0.3 l/s
  });
  const [targetWaterVelocity, setTargetWaterVelocity] = useState(1.5); // m/s (standard 1.0 - 2.0 m/s)

  // 2. Pipe, Armature & Geometry State
  const [compType, setCompType] = useState<VztComponentType>('Trubka_Voda');
  const [dn, setDn] = useState<number>(20);
  const [length, setLength] = useState(1500); // mm
  const [angle, setAngle] = useState(90);
  const [offsetMm, setOffsetMm] = useState(150);
  const [material, setMaterial] = useState<'PPR' | 'PEX_AL_PEX' | 'MED' | 'NEREZ'>('PPR');
  const [hasInsulation, setHasInsulation] = useState(true);
  const [note, setNote] = useState('');

  // 3. Pressure Loss State
  const [pipeLengthM, setPipeLengthM] = useState(20);
  const [geodeticHeightM, setGeodeticHeightM] = useState(3.0); // Geodetické převýšení
  const [pipeRoughnessMm, setPipeRoughnessMm] = useState(0.007); // PPR plastic
  const [fittingsCount, setFittingsCount] = useState({
    elbow90: 5,
    elbow45: 2,
    tPieceBranch: 4,
    tPieceDirect: 2,
    reducer: 2,
    ballValve: 3, // Hlavní uzávěry
    angleValve: 6, // Rohové ventily u baterií
    checkValve: 1, // Zpětná klapka
    waterMeter: 1, // Bytový vodoměr
    filterStrainer: 1, // Jemný filtr pevných částic
    pressureRegulator: 0, // Redukční ventil
  });

  // Calculation: Design Flow QD & Optimal DN according to ČSN 75 5455
  const waterSizing = useMemo(() => {
    let effectiveFlowLs = 0;

    if (flowMode === 'MANUAL') {
      effectiveFlowLs = manualFlowLs;
    } else {
      // ČSN 75 5455: QD = sqrt(sum(n_i * q_i^2))
      const sumFixturesSquared =
        fixtures.washbasin * Math.pow(0.1, 2) +
        fixtures.wc * Math.pow(0.1, 2) +
        fixtures.shower * Math.pow(0.2, 2) +
        fixtures.sink * Math.pow(0.2, 2) +
        fixtures.bathtub * Math.pow(0.3, 2);

      effectiveFlowLs = Math.sqrt(sumFixturesSquared);
    }

    const flowM3s = effectiveFlowLs / 1000;
    const flowM3h = effectiveFlowLs * 3.6;

    // Search optimal DN for velocity around targetWaterVelocity
    let chosenDn = 15;
    let minVelDiff = 999;
    let bestVelocity = 0;

    for (const [key, val] of Object.entries(STANDARD_DN_PIPES)) {
      const dNum = parseInt(key);
      const innerM = val.inner / 1000;
      const area = Math.PI * Math.pow(innerM / 2, 2);
      const vel = flowM3s / area;
      const diff = Math.abs(vel - targetWaterVelocity);
      if (diff < minVelDiff) {
        minVelDiff = diff;
        chosenDn = dNum;
        bestVelocity = vel;
      }
    }

    return {
      effectiveFlowLs: Math.round(effectiveFlowLs * 100) / 100,
      flowM3h: Math.round(flowM3h * 100) / 100,
      flowM3s,
      recommendedDn: chosenDn,
      actualVelocity: Math.round(bestVelocity * 100) / 100,
    };
  }, [flowMode, manualFlowLs, fixtures, targetWaterVelocity]);

  // Calculations: Fitting Geometry & BOM Cost
  const fittingMetrics = useMemo(() => {
    const pipeInfo = STANDARD_DN_PIPES[dn] || STANDARD_DN_PIPES[20];
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

    let materialDensity = 900; // PPR plastic
    let unitCostBase = 45;
    let unitSellBase = 110;

    if (material === 'MED') {
      materialDensity = 8960;
      unitCostBase = 150;
      unitSellBase = 310;
    } else if (material === 'PEX_AL_PEX') {
      materialDensity = 1400;
      unitCostBase = 60;
      unitSellBase = 135;
    } else if (material === 'NEREZ') {
      materialDensity = 7900;
      unitCostBase = 210;
      unitSellBase = 420;
    }

    const metalAreaM2 = Math.PI * (Math.pow(outerM / 2, 2) - Math.pow(innerM / 2, 2));
    const dryWeight = metalAreaM2 * (developedLength / 1000) * materialDensity;

    // Water volume
    const innerAreaM2 = Math.PI * Math.pow(innerM / 2, 2);
    const innerVolumeM3 = innerAreaM2 * (developedLength / 1000);
    const innerVolumeLiters = innerVolumeM3 * 1000;
    const waterWeight = innerVolumeLiters * 1.0; // 1 liter = 1 kg
    const totalOperatingWeight = dryWeight + waterWeight;

    const costPrice = Math.round(
      (unitCostBase * (developedLength / 1000) * (dn / 20) + (compType === 'Armatura_Ventil' ? 380 : 0)) *
        (hasInsulation ? 1.2 : 1.0)
    );
    const sellPrice = Math.round(
      (unitSellBase * (developedLength / 1000) * (dn / 20) + (compType === 'Armatura_Ventil' ? 760 : 0)) *
        (hasInsulation ? 1.25 : 1.0)
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
  }, [dn, length, compType, angle, offsetMm, material, hasInsulation]);

  // Calculations: Hydraulic Pressure Loss & Outflow Check
  const pressureLoss = useMemo(() => {
    const pipeInfo = STANDARD_DN_PIPES[dn] || STANDARD_DN_PIPES[20];
    const innerDiamM = pipeInfo.inner / 1000;
    const flowM3s = waterSizing.flowM3s;
    const areaM2 = Math.PI * Math.pow(innerDiamM / 2, 2);
    const velocity = Math.max(0.01, flowM3s / areaM2);
    const rho = 1000.0; // kg/m3 (Cold water)
    const dynPressure = 0.5 * rho * Math.pow(velocity, 2);

    const nu = 1.0e-6; // Kinematic viscosity of water at 20°C
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

    // Geodetic loss: delta_p_geo = rho * g * h
    const geodeticLossPa = rho * 9.81 * geodeticHeightM;

    // Local resistance coefficients
    const xiSum =
      fittingsCount.elbow90 * 1.1 +
      fittingsCount.elbow45 * 0.4 +
      fittingsCount.tPieceBranch * 1.3 +
      fittingsCount.tPieceDirect * 0.3 +
      fittingsCount.reducer * 0.25 +
      fittingsCount.ballValve * 0.25 +
      fittingsCount.angleValve * 2.5 +
      fittingsCount.checkValve * 2.0;

    const fittingsLossPa = xiSum * dynPressure;

    // Equipment added losses (Water meter ~25 kPa, filters ~10 kPa)
    const equipmentLossPa =
      fittingsCount.waterMeter * 25000 +
      fittingsCount.filterStrainer * 8000 +
      fittingsCount.pressureRegulator * 12000;

    const totalPressureLossPa = lengthLossPa + geodeticLossPa + fittingsLossPa + equipmentLossPa;
    const totalPressureLossKPa = totalPressureLossPa / 1000;
    const totalPressureLossBar = totalPressureLossPa / 100000;

    return {
      velocity: Math.round(velocity * 100) / 100,
      dynPressure: Math.round(dynPressure * 10) / 10,
      reynolds: Math.round(reynolds),
      linearLossPaM: Math.round(linearLossPaM * 10) / 10,
      lengthLossKPa: Math.round((lengthLossPa / 1000) * 100) / 100,
      geodeticLossKPa: Math.round((geodeticLossPa / 1000) * 100) / 100,
      fittingsLossKPa: Math.round((fittingsLossPa / 1000) * 100) / 100,
      equipmentLossKPa: Math.round((equipmentLossPa / 1000) * 100) / 100,
      totalPressureLossPa: Math.round(totalPressureLossPa),
      totalPressureLossKPa: Math.round(totalPressureLossKPa * 100) / 100,
      totalPressureLossBar: Math.round(totalPressureLossBar * 100) / 100,
    };
  }, [dn, waterSizing.flowM3s, pipeLengthM, geodeticHeightM, pipeRoughnessMm, fittingsCount]);

  const handleApplyRecommendedDn = () => {
    setDn(waterSizing.recommendedDn);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);

    await onAddComponent({
      companyId: '00000000-0000-4000-8000-000000000001',
      projectId: selectedProjectId,
      projectName: proj?.name,
      medium: 'VODA',
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
      flowRate: waterSizing.effectiveFlowLs,
      velocity: pressureLoss.velocity,
      pressureLossPa: pressureLoss.totalPressureLossPa,
      note: note || `Voda ZTI — ${compType} (DN${dn}, Q=${waterSizing.effectiveFlowLs} l/s, ČSN 75 5455)`,
    });

    setNote('');
    alert(`✅ Vodovodní prvek byl úspěšně přidán do kusovníku stavby (${proj?.name || 'Stavba'}).`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Fixtures & Water Flow Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Droplets className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>1. Výpočtový průtok vody QD dle ČSN 75 5455 & Dimenzování ZTI</span>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  ČSN 75 5455
                </span>
              </h3>
              <p className="text-slate-400 text-xs">Výpočet současnosti odběrů zařizovacích předmětů a optimálního profilu DN</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyRecommendedDn}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white font-bold text-xs hover:bg-blue-400 transition-all shadow-md shadow-blue-500/20"
          >
            <span>Použít DN{waterSizing.recommendedDn} ve 3D</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Controls */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Režim zadání průtoku:</label>
              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFlowMode('FIXTURES')}
                  className={`px-2 py-0.5 rounded ${flowMode === 'FIXTURES' ? 'bg-blue-500 text-white font-bold' : 'text-slate-400'}`}
                >
                  Předměty
                </button>
                <button
                  type="button"
                  onClick={() => setFlowMode('MANUAL')}
                  className={`px-2 py-0.5 rounded ${flowMode === 'MANUAL' ? 'bg-blue-500 text-white font-bold' : 'text-slate-400'}`}
                >
                  Přímý l/s
                </button>
              </div>
            </div>

            {flowMode === 'FIXTURES' ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-300">Umyvadla (0.1 l/s):</span>
                  <input
                    type="number"
                    value={fixtures.washbasin}
                    onChange={e => setFixtures({ ...fixtures, washbasin: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-200"
                  />
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-300">WC splachovače (0.1 l/s):</span>
                  <input
                    type="number"
                    value={fixtures.wc}
                    onChange={e => setFixtures({ ...fixtures, wc: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-200"
                  />
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-300">Sprchy (0.2 l/s):</span>
                  <input
                    type="number"
                    value={fixtures.shower}
                    onChange={e => setFixtures({ ...fixtures, shower: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-200"
                  />
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-300">Dřezy kuchyň (0.2 l/s):</span>
                  <input
                    type="number"
                    value={fixtures.sink}
                    onChange={e => setFixtures({ ...fixtures, sink: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-200"
                  />
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-300">Koupací vany (0.3 l/s):</span>
                  <input
                    type="number"
                    value={fixtures.bathtub}
                    onChange={e => setFixtures({ ...fixtures, bathtub: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-slate-200"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Přímý průtok vody (l/s)</label>
                <input
                  type="number"
                  value={manualFlowLs}
                  onChange={e => setManualFlowLs(parseFloat(e.target.value) || 0.1)}
                  step="0.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono font-bold"
                />
              </div>
            )}
          </div>

          {/* Sizing Results */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Výpočtový průtok QD</span>
              <div className="text-3xl font-black text-blue-400 font-mono mt-1">
                {waterSizing.effectiveFlowLs} <span className="text-base font-normal text-slate-400">l/s</span>
              </div>
              <div className="text-sm text-slate-200 font-mono font-bold mt-2">
                {waterSizing.flowM3h} m³/h
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Vypočteno podle součinitele současnosti ČSN 75 5455.
            </div>
          </div>

          {/* Sizing DN Recommendation */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Doporučená světlost ZTI</span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                DN {waterSizing.recommendedDn}
              </div>
              <div className="text-xs text-slate-300 mt-1 font-mono">
                {STANDARD_DN_PIPES[waterSizing.recommendedDn]?.label}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Rychlost proudění: <strong className="text-emerald-300 font-mono">{waterSizing.actualVelocity} m/s</strong>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Udržuje bezpečnou rychlost proti vodním rázům a erozi potrubí (1.0–2.0 m/s).
            </div>
          </div>
        </div>
      </div>

      {/* 2. 3D Model & Water Component Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Viewport Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col min-h-[440px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-slate-200 text-sm">
                  3D Model Vodovodního Potrubí — DN{dn} ({material})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsWireframe(!isWireframe)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isWireframe ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Drátový model
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`p-1.5 rounded-lg border text-xs ${
                    autoRotate ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'
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
                  medium: 'VODA',
                  type: compType,
                  diameter: STANDARD_DN_PIPES[dn]?.outer || 25,
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
              <div className="text-[10px] text-slate-500 mt-0.5">Trubky + fitinky</div>
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
            <Settings2 className="w-5 h-5 text-blue-400" />
            <span>Parametry vodovodního prvku (ZTI)</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Přiřadit ke stavbě</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
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
                {(['Trubka_Voda', 'Koleno', 'Odsazení', 'Redukce', 'T-Kus', 'Armatura_Ventil'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCompType(t)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      compType === t
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono font-bold focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {compType === 'Koleno' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Úhel kolena (°)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[90, 60, 45, 30].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAngle(a)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border ${
                        angle === a ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-400'
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
                    min="20"
                    max="500"
                    step="10"
                    value={offsetMm}
                    onChange={e => setOffsetMm(parseInt(e.target.value))}
                    className="flex-1 accent-blue-400"
                  />
                  <span className="font-mono font-bold text-blue-400 text-sm w-16 text-right">{offsetMm} mm</span>
                </div>
              </div>
            )}

            {/* Material */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Materiál rozvodů vody</label>
              <select
                value={material}
                onChange={e => setMaterial(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="PPR">PPR polypropylen (PN20 svařovaný)</option>
                <option value="PEX_AL_PEX">Vícevrstvý plastohliník PEX-AL-PEX</option>
                <option value="MED">Měď Cu lisovaná / pájená</option>
                <option value="NEREZ">Lisovaná nerezová ocel (AISI 316 / 1.4401)</option>
              </select>
            </div>

            {/* Options */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInsulation}
                  onChange={e => setHasInsulation(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0"
                />
                <span>Trubicová návleková tepelná izolace (tl. 13 mm)</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Poznámka / Popis</label>
              <input
                type="text"
                placeholder="např. Stoupačka studené pitné vody V1"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat do kusovníku stavby</span>
            </button>
          </form>
        </div>
      </div>

      {/* 3. Hydraulic Pressure Loss & Outflow Pressure */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-4">
          <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Gauge className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>3. Hydraulická tlaková ztráta vodovodu & Přetlak na výtoku</span>
              <span className="text-[11px] font-mono text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                Darcy-Weisbach & Geodetické převýšení
              </span>
            </h3>
            <p className="text-slate-400 text-xs">Výpočet tlakových ztrát potrubí, vodoměru, armatur a ověření normového přetlaku</p>
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Geodetické převýšení h (m)</label>
              <input
                type="number"
                value={geodeticHeightM}
                onChange={e => setGeodeticHeightM(parseFloat(e.target.value) || 0)}
                step="0.5"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-2">Armatury & vodoměry v trase:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Vodoměry (25 kPa):</span>
                  <input
                    type="number"
                    value={fittingsCount.waterMeter}
                    onChange={e => setFittingsCount({ ...fittingsCount, waterMeter: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Rohové ventily:</span>
                  <input
                    type="number"
                    value={fittingsCount.angleValve}
                    onChange={e => setFittingsCount({ ...fittingsCount, angleValve: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Jemný filtr:</span>
                  <input
                    type="number"
                    value={fittingsCount.filterStrainer}
                    onChange={e => setFittingsCount({ ...fittingsCount, filterStrainer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Kulové uzávěry:</span>
                  <input
                    type="number"
                    value={fittingsCount.ballValve}
                    onChange={e => setFittingsCount({ ...fittingsCount, ballValve: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown loss */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">Hydraulický rozpad ztrát:</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Rychlost v trubce:</span>
                  <span className="font-mono text-blue-400 font-bold">{pressureLoss.velocity} m/s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Tření v délce:</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.lengthLossKPa} kPa</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Geodetické převýšení ({geodeticHeightM} m):</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.geodeticLossKPa} kPa</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Místní odpory (armatury):</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.fittingsLossKPa} kPa</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Vodoměr & filtry:</span>
                  <span className="font-mono text-amber-400 font-bold">{pressureLoss.equipmentLossKPa} kPa</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-950/40 rounded-lg border border-blue-800/60 text-xs">
              <div className="flex items-center space-x-1.5 text-blue-300 font-semibold mb-1">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>Lineární tlakový odpor R:</span>
              </div>
              <div className="text-lg font-bold text-blue-400 font-mono">{pressureLoss.linearLossPaM} Pa/m</div>
            </div>
          </div>

          {/* Total Loss */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-xl border border-blue-500/40 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-blue-400 tracking-wider">Celková tlaková ztráta vodovodu</span>
              <div className="text-3xl font-black text-white font-mono mt-1 flex items-baseline space-x-2">
                <span>{pressureLoss.totalPressureLossKPa}</span>
                <span className="text-sm font-normal text-slate-400">kPa ({pressureLoss.totalPressureLossBar} bar)</span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Kontrola přetlaku na výtoku (ČSN 75 5455)</span>
                <div className="text-base font-bold text-emerald-400 mt-1 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Vyhovuje normě (p_dispo ≥ 100 kPa)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Při uličním tlaku 4.0 bar zůstává na nejvyšším výtoku dostatečný dynamický tlak pro komfortní provoz.
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-4 p-2 bg-slate-950 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Optimálně dimenzováno pro hygienu a tichý rozvod vody.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
