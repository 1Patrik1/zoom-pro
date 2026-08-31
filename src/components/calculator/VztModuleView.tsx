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
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Project, VztComponent, VztComponentType, VztProfileShape } from '../../types';
import { Vzt3DViewer } from '../Vzt3DViewer';

interface VztModuleViewProps {
  projects: Project[];
  costPerSqMeter: number;
  sellPerSqMeter: number;
  onAddComponent: (comp: Omit<VztComponent, 'id' | 'createdAt'>) => Promise<void>;
}

const STANDARD_SPIRO_DIAMETERS = [100, 125, 160, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 1000];

const STANDARD_RECT_SIZES = [
  { w: 200, h: 200 },
  { w: 300, h: 200 },
  { w: 400, h: 250 },
  { w: 500, h: 300 },
  { w: 600, h: 400 },
  { w: 800, h: 400 },
  { w: 1000, h: 500 },
  { w: 1200, h: 600 },
];

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

  // 2. Profile Shape & Fitting Geometry State
  const [profileShape, setProfileShape] = useState<VztProfileShape>('HRANATE'); // 'HRANATE' | 'KULATE' | 'PRECHOD'
  const [compType, setCompType] = useState<VztComponentType>('Koleno');

  // Rectangular Dimensions
  const [width, setWidth] = useState(800); // Šířka A
  const [height, setHeight] = useState(400); // Výška B
  const [width2, setWidth2] = useState(600); // Výstup Šířka A2
  const [height2, setHeight2] = useState(300); // Výstup Výška B2
  const [branchWidth, setBranchWidth] = useState(400);
  const [branchHeight, setBranchHeight] = useState(300);
  const [flangeType, setFlangeType] = useState<'P20' | 'P30' | 'P40' | 'SPIRO_SPOJKA' | 'PRIRUBA_KRUHOVA' | 'BEZ_PRIRUBY'>('P20');

  // Circular Dimensions
  const [diameter, setDiameter] = useState(250); // Průměr Ø D
  const [diameter2, setDiameter2] = useState(200); // Výstup Ø D2
  const [branchDiameter, setBranchDiameter] = useState(160); // Odbočka Ø D_odb

  // Shared Common Dimensions
  const [length, setLength] = useState(1500); // Délka L
  const [angle, setAngle] = useState(90); // Úhel kolena α (90°, 60°, 45°, 30°, 15°)
  const [radiusMm, setRadiusMm] = useState(200); // Poloměr ohybu R
  const [offsetMm, setOffsetMm] = useState(250); // Vyosení e (mm)
  const [silencerBaffles, setSilencerBaffles] = useState(2); // Počet tlumících kulis

  // Material & Accessories
  const [material, setMaterial] = useState<'POZINK' | 'NEREZ' | 'HLINIK'>('POZINK');
  const [sheetThickness, setSheetThickness] = useState(0.8);
  const [requiresAccessDoor, setRequiresAccessDoor] = useState(false);
  const [hasInsulation, setHasInsulation] = useState(false);
  const [insulationThicknessMm, setInsulationThicknessMm] = useState(20);
  const [note, setNote] = useState('');

  // 3. System Pressure Loss Network State
  const [ductLengthM, setDuctLengthM] = useState(25);
  const [ductRoughnessMm, setDuctRoughnessMm] = useState(0.15); // DX51D galvanized
  const [fittingsCount, setFittingsCount] = useState({
    elbow90: 3,
    elbow45: 2,
    tBranch: 2,
    reducer: 2,
    soundAttenuator: 1,
    filterG4: 1,
    filterF7: 1,
    damper: 2,
    grille: 4,
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

  // Calculations: Geometry, Surface Area, Sheet Weight & BOM Cost
  const fittingMetrics = useMemo(() => {
    const isRound = profileShape === 'KULATE';
    const isTransition = profileShape === 'PRECHOD';
    const lM = length / 1000;
    const wM = width / 1000;
    const hM = height / 1000;
    const dM = diameter / 1000;
    const d2M = diameter2 / 1000;
    const rM = radiusMm / 1000;

    let area = 0;
    let developedLength = length;
    let innerRadius = 0;
    let centerRadius = 0;
    let outerRadius = 0;

    if (compType === 'Rovné' || compType === 'Kruhové') {
      if (isRound) {
        area = Math.PI * dM * lM;
        developedLength = length;
      } else {
        area = 2 * (wM + hM) * lM;
        developedLength = length;
      }
    } else if (compType === 'Koleno') {
      const angleRad = (angle * Math.PI) / 180;
      if (isRound) {
        // Round Spiro Elbow
        const bendR = rM || (dM * 1.0);
        centerRadius = Math.round(bendR * 1000);
        innerRadius = Math.round(Math.max(0, bendR - dM / 2) * 1000);
        outerRadius = Math.round((bendR + dM / 2) * 1000);
        // Area of torus segment: 2 * PI * r_tube * (R_bend * angle)
        area = Math.PI * dM * (bendR * angleRad);
        developedLength = Math.round(bendR * 1000 * angleRad);
      } else {
        // Rectangular Elbow (Cheeks + Throat + Heel)
        const bendR = rM || (Math.max(wM, hM) * 0.8);
        centerRadius = Math.round(bendR * 1000);
        innerRadius = Math.round(Math.max(50, (bendR - wM / 2) * 1000));
        outerRadius = Math.round((bendR + wM / 2) * 1000);
        // Area: 2 * cheek plates + throat + heel
        const cheekArea = 2 * (angleRad / 2) * (Math.pow(outerRadius / 1000, 2) - Math.pow(innerRadius / 1000, 2));
        const throatHeelArea = (outerRadius / 1000 * angleRad * hM) + (innerRadius / 1000 * angleRad * hM);
        area = cheekArea + throatHeelArea;
        developedLength = Math.round(bendR * 1000 * angleRad);
      }
    } else if (compType === 'Redukce') {
      if (isTransition) {
        // Rectangular to Round
        const rectPerimeter = 2 * (wM + hM);
        const roundPerimeter = Math.PI * dM;
        area = ((rectPerimeter + roundPerimeter) / 2) * lM;
        developedLength = length;
      } else if (isRound) {
        // Circular Reducer (Frustum)
        const slantHeight = Math.sqrt(Math.pow(lM, 2) + Math.pow(Math.abs(dM - d2M) / 2, 2));
        area = Math.PI * ((dM + d2M) / 2) * slantHeight;
        developedLength = length;
      } else {
        // Rectangular Reducer
        const w2M = width2 / 1000;
        const h2M = height2 / 1000;
        const avgW = (wM + w2M) / 2;
        const avgH = (hM + h2M) / 2;
        area = 2 * (avgW + avgH) * lM;
        developedLength = length;
      }
    } else if (compType === 'Odsazení') {
      const offsetM = offsetMm / 1000;
      const hypLength = Math.sqrt(Math.pow(lM, 2) + Math.pow(offsetM, 2));
      if (isRound) {
        area = Math.PI * dM * hypLength;
      } else {
        area = 2 * (wM + hM) * hypLength;
      }
      developedLength = Math.round(hypLength * 1000);
    } else if (compType === 'T-Kus' || compType === 'Odbočka') {
      if (isRound) {
        const brDM = branchDiameter / 1000;
        area = Math.PI * dM * lM + Math.PI * brDM * (lM * 0.45);
        developedLength = length + Math.round(brDM * 500);
      } else {
        const brWM = branchWidth / 1000;
        const brHM = branchHeight / 1000;
        area = 2 * (wM + hM) * lM + 2 * (brWM + brHM) * (lM * 0.45);
        developedLength = length + Math.round(brWM * 500);
      }
    } else if (compType === 'Klapka') {
      if (isRound) {
        area = Math.PI * dM * (lM * 0.6) + Math.PI * Math.pow(dM / 2, 2);
      } else {
        area = 2 * (wM + hM) * (lM * 0.5) + (wM * hM * 1.2);
      }
      developedLength = Math.round(lM * 500);
    } else if (compType === 'Tlumic_Hluku') {
      if (isRound) {
        area = Math.PI * (dM + 0.2) * lM + Math.PI * dM * lM;
      } else {
        area = 2 * (wM + hM) * lM + (silencerBaffles * 2 * hM * lM * 0.85);
      }
      developedLength = length;
    } else if (compType === 'Zaslepka') {
      if (isRound) {
        area = Math.PI * Math.pow(dM / 2, 2) + Math.PI * dM * 0.08;
      } else {
        area = wM * hM + 2 * (wM + hM) * 0.04;
      }
      developedLength = Math.round(dM * 1000 || wM * 1000);
    } else {
      area = 2 * (wM + hM) * lM;
      developedLength = length;
    }

    if (requiresAccessDoor) {
      area += 0.25;
    }

    // Material density & cost multipliers
    let density = 7850; // kg/m3 for steel
    let unitCostMultiplier = 1.0;
    if (material === 'HLINIK') {
      density = 2700;
      unitCostMultiplier = 1.65;
    } else if (material === 'NEREZ') {
      density = 7900;
      unitCostMultiplier = 2.45;
    }

    const weight = Math.max(0.1, area * (sheetThickness / 1000) * density);
    const baseUnitCost = costPerSqMeter || 450;
    const baseUnitSell = sellPerSqMeter || 980;

    const costPrice = Math.round(
      baseUnitCost * Math.max(0.4, area) * unitCostMultiplier +
        (requiresAccessDoor ? 350 : 0) +
        (hasInsulation ? area * (insulationThicknessMm >= 40 ? 280 : 180) : 0)
    );

    const sellPrice = Math.round(
      baseUnitSell * Math.max(0.4, area) * unitCostMultiplier +
        (requiresAccessDoor ? 750 : 0) +
        (hasInsulation ? area * (insulationThicknessMm >= 40 ? 560 : 360) : 0)
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
    profileShape,
    compType,
    width,
    height,
    diameter,
    diameter2,
    branchWidth,
    branchHeight,
    branchDiameter,
    width2,
    height2,
    length,
    angle,
    radiusMm,
    offsetMm,
    silencerBaffles,
    material,
    sheetThickness,
    requiresAccessDoor,
    hasInsulation,
    insulationThicknessMm,
    costPerSqMeter,
    sellPerSqMeter,
  ]);

  // Calculations: Pressure Drops & Fan Power
  const pressureLoss = useMemo(() => {
    const rho = 1.204; // kg/m3 (Air at 20°C)
    const nu = 1.51e-5; // m2/s
    const flowM3s = airFlowM3h / 3600;

    let eqDiamM = 0.25;
    let crossAreaM2 = 0.05;

    if (profileShape === 'KULATE') {
      eqDiamM = diameter / 1000;
      crossAreaM2 = Math.PI * Math.pow(eqDiamM / 2, 2);
    } else {
      eqDiamM = (2 * width * height) / (width + height) / 1000;
      crossAreaM2 = (width / 1000) * (height / 1000);
    }

    const velocity = Math.max(0.01, flowM3s / Math.max(0.001, crossAreaM2));
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
      fittingsCount.elbow90 * (profileShape === 'KULATE' ? 0.28 : 0.38) +
      fittingsCount.elbow45 * (profileShape === 'KULATE' ? 0.15 : 0.22) +
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
  }, [airFlowM3h, profileShape, diameter, width, height, ductLengthM, ductRoughnessMm, fittingsCount]);

  const handleApplySizingTo3D = () => {
    if (profileShape === 'KULATE') {
      setDiameter(sizing.chosenSpiro);
    } else {
      setWidth(sizing.recWidth);
      setHeight(sizing.recHeight);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);

    const isRound = profileShape === 'KULATE';
    const isTransition = profileShape === 'PRECHOD';

    const dimLabel = isTransition
      ? `${width}×${height} → Ø${diameter} mm`
      : isRound
      ? compType === 'Redukce'
        ? `Ø${diameter} → Ø${diameter2} mm`
        : `Ø${diameter} mm`
      : compType === 'Redukce'
      ? `${width}×${height} → ${width2}×${height2} mm`
      : `${width}×${height} mm`;

    await onAddComponent({
      companyId: '00000000-0000-4000-8000-000000000001',
      projectId: selectedProjectId,
      projectName: proj?.name,
      medium: 'VZT',
      shape: profileShape,
      type: compType,
      width: !isRound ? width : undefined,
      height: !isRound ? height : undefined,
      diameter: (isRound || isTransition) ? diameter : undefined,
      diameter2: (isRound && compType === 'Redukce') ? diameter2 : undefined,
      width2: (!isRound && compType === 'Redukce') ? width2 : undefined,
      height2: (!isRound && compType === 'Redukce') ? height2 : undefined,
      branchWidth: (!isRound && (compType === 'T-Kus' || compType === 'Odbočka')) ? branchWidth : undefined,
      branchHeight: (!isRound && (compType === 'T-Kus' || compType === 'Odbočka')) ? branchHeight : undefined,
      branchDiameter: (isRound && (compType === 'T-Kus' || compType === 'Odbočka')) ? branchDiameter : undefined,
      length,
      angle: compType === 'Koleno' ? angle : undefined,
      radius: compType === 'Koleno' ? radiusMm : undefined,
      offset: compType === 'Odsazení' ? offsetMm : undefined,
      flangeType: isRound ? 'SPIRO_SPOJKA' : flangeType,
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
      note: note || `VZT [${profileShape}] — ${compType} (${dimLabel}${compType === 'Koleno' ? `, ${angle}°` : ''}, L=${length}mm)`,
    });

    setNote('');
    alert(`✅ VZT díl [${profileShape} ${compType} ${dimLabel}] byl úspěšně uložen do kusovníku.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Sizing Section Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>1. Aerodynamické dimenzování VZT (Průtok na průřez)</span>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  ČSN EN 1507 • ČSN EN 1506
                </span>
              </h3>
              <p className="text-slate-400 text-xs">Výpočet optimálního kruhového Spiro potrubí a čtyřhranného potrubí dle rychlosti</p>
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
                  3D VZT Model — {compType} [{profileShape}]
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
                  shape: profileShape,
                  type: compType,
                  width,
                  height,
                  diameter,
                  diameter2,
                  width2,
                  height2,
                  branchWidth,
                  branchHeight,
                  branchDiameter,
                  length,
                  angle,
                  radius: radiusMm,
                  offset: offsetMm,
                  material,
                  sheetThickness,
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
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <span>Parametry & Rozměry VZT dílu</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Stavba */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Přiřadit ke stavbě</label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 1. SELECTION: PRŮŘEZ / TVAR (HRANATÉ vs KULATÉ vs PŘECHODKA) */}
            <div>
              <label className="block text-xs font-bold text-cyan-400 mb-1.5 flex items-center justify-between">
                <span>1. Tvar průřezu (Dimenze)</span>
                <span className="text-[10px] text-slate-400 font-normal">Hranaté / Kulaté</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setProfileShape('HRANATE')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    profileShape === 'HRANATE'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🔲</span>
                  <span>Hranaté (4HR)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileShape('KULATE')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    profileShape === 'KULATE'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚪</span>
                  <span>Kulaté (Spiro)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileShape('PRECHOD');
                    setCompType('Redukce');
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    profileShape === 'PRECHOD'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🔄</span>
                  <span>4HR ↔ Spiro</span>
                </button>
              </div>
            </div>

            {/* 2. SELECTION: TYP TVAROVKY (KOLENO, ROVNÉ, REDUKCE, ETÁŽKA, T-KUS, KLAPKA, TLUMIČ, ZÁSLEPKA) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">2. Typ tvarovky / prvku</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { type: 'Koleno', label: 'Koleno' },
                  { type: 'Rovné', label: 'Rovné' },
                  { type: 'Redukce', label: 'Redukce' },
                  { type: 'Odsazení', label: 'Etážka' },
                  { type: 'T-Kus', label: 'T-Kus' },
                  { type: 'Klapka', label: 'Klapka' },
                  { type: 'Tlumic_Hluku', label: 'Tlumič' },
                  { type: 'Zaslepka', label: 'Záslepka' },
                ].map(item => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setCompType(item.type as VztComponentType)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      compType === item.type
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. DYNAMIC DIMENSION INPUTS ACCORDING TO SHAPE AND FITTING TYPE */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
                <span>3. Rozměry & Dimenze ({profileShape === 'KULATE' ? 'Kruhové' : profileShape === 'PRECHOD' ? 'Přechodka' : 'Čtyřhranné'})</span>
                <span className="text-[10px] text-cyan-400 font-mono">v milimetrech [mm]</span>
              </div>

              {/* KULATÉ / SPIRO DIMENZE */}
              {profileShape === 'KULATE' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {compType === 'Redukce' ? 'Vstupní průměr Ø D₁ (mm)' : 'Průměr Ø Spiro potrubí (mm)'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={diameter}
                        onChange={e => setDiameter(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                      >
                        {STANDARD_SPIRO_DIAMETERS.map(d => (
                          <option key={d} value={d}>
                            Ø {d} mm (ČSN EN 1506)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={diameter}
                        onChange={e => setDiameter(parseInt(e.target.value) || 100)}
                        step="5"
                        placeholder="Vlastní Ø"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Redukce: Výstupní průměr D2 */}
                  {compType === 'Redukce' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výstupní průměr Ø D₂ (mm)</label>
                      <select
                        value={diameter2}
                        onChange={e => setDiameter2(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold"
                      >
                        {STANDARD_SPIRO_DIAMETERS.filter(d => d !== diameter).map(d => (
                          <option key={d} value={d}>
                            Ø {d} mm
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* T-Kus: Průměr odbočky */}
                  {(compType === 'T-Kus' || compType === 'Odbočka') && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Průměr odbočky Ø D_odb (mm)</label>
                      <select
                        value={branchDiameter}
                        onChange={e => setBranchDiameter(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                      >
                        {STANDARD_SPIRO_DIAMETERS.map(d => (
                          <option key={d} value={d}>
                            Ø {d} mm
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Délka L */}
                  {compType !== 'Koleno' && compType !== 'Zaslepka' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Délka L (mm)</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={length}
                          onChange={e => setLength(parseInt(e.target.value) || 100)}
                          step="100"
                          min="100"
                          max="6000"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                        />
                        <div className="flex space-x-1">
                          {[500, 1000, 1500, 3000].map(lVal => (
                            <button
                              key={lVal}
                              type="button"
                              onClick={() => setLength(lVal)}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              {lVal}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Koleno Spiro: Úhel a Rádius */}
                  {compType === 'Koleno' && (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Úhel kolena α</label>
                        <div className="grid grid-cols-5 gap-1">
                          {[90, 60, 45, 30, 15].map(a => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => setAngle(a)}
                              className={`py-1 rounded text-xs font-bold border ${
                                angle === a ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                              }`}
                            >
                              {a}°
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Poloměr ohybu R (mm)</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={radiusMm}
                            onChange={e => setRadiusMm(parseInt(e.target.value) || 50)}
                            className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono"
                          />
                          <div className="flex space-x-1 flex-1">
                            <button
                              type="button"
                              onClick={() => setRadiusMm(Math.round(diameter * 1.0))}
                              className="flex-1 px-1.5 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              1.0×D ({Math.round(diameter * 1.0)})
                            </button>
                            <button
                              type="button"
                              onClick={() => setRadiusMm(Math.round(diameter * 1.5))}
                              className="flex-1 px-1.5 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              1.5×D ({Math.round(diameter * 1.5)})
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : profileShape === 'PRECHOD' ? (
                /* PŘECHODKA 4HRANNÉ NA SPIRO */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Vstup Šířka A (mm)</label>
                      <input
                        type="number"
                        value={width}
                        onChange={e => setWidth(parseInt(e.target.value) || 100)}
                        step="50"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Vstup Výška B (mm)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(parseInt(e.target.value) || 100)}
                        step="50"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výstup Ø Spiro (mm)</label>
                      <select
                        value={diameter}
                        onChange={e => setDiameter(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold"
                      >
                        {STANDARD_SPIRO_DIAMETERS.map(d => (
                          <option key={d} value={d}>
                            Ø {d} mm
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Délka L (mm)</label>
                      <input
                        type="number"
                        value={length}
                        onChange={e => setLength(parseInt(e.target.value) || 100)}
                        step="50"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* ČTYŘHRANNÉ / HRANATÉ DIMENZE */
                <div className="space-y-3">
                  {/* Presets */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Rychlá volba standardního rozměru:</label>
                    <div className="flex flex-wrap gap-1">
                      {STANDARD_RECT_SIZES.map(s => (
                        <button
                          key={`${s.w}x${s.h}`}
                          type="button"
                          onClick={() => {
                            setWidth(s.w);
                            setHeight(s.h);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            width === s.w && height === s.h
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {s.w}×{s.h}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Šířka A (mm)</label>
                      <input
                        type="number"
                        value={width}
                        onChange={e => setWidth(parseInt(e.target.value) || 100)}
                        step="50"
                        min="100"
                        max="3000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výška B (mm)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(parseInt(e.target.value) || 100)}
                        step="50"
                        min="100"
                        max="3000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Délka L (mm)</label>
                      <input
                        type="number"
                        value={length}
                        onChange={e => setLength(parseInt(e.target.value) || 100)}
                        step="100"
                        min="100"
                        max="3000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* HRANATÉ KOLENO: Úhel a Poloměr ohybu R */}
                  {compType === 'Koleno' && (
                    <div className="space-y-2.5 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Úhel kolena α</label>
                        <div className="grid grid-cols-5 gap-1">
                          {[90, 60, 45, 30, 15].map(a => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => setAngle(a)}
                              className={`py-1 rounded text-xs font-bold border ${
                                angle === a ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-950 border-slate-700 text-slate-300'
                              }`}
                            >
                              {a}°
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Střední rádius / Poloměr ohybu R (mm)
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={radiusMm}
                            onChange={e => setRadiusMm(parseInt(e.target.value) || 50)}
                            className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono font-bold"
                          />
                          <div className="flex space-x-1 flex-1">
                            <button
                              type="button"
                              onClick={() => setRadiusMm(100)}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              R100
                            </button>
                            <button
                              type="button"
                              onClick={() => setRadiusMm(150)}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              R150
                            </button>
                            <button
                              type="button"
                              onClick={() => setRadiusMm(Math.round(width * 0.5))}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              0.5×A ({Math.round(width * 0.5)})
                            </button>
                            <button
                              type="button"
                              onClick={() => setRadiusMm(Math.round(width * 1.0))}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              1.0×A ({width})
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex space-x-3">
                          <span>Vnitřní rádius: <strong className="text-slate-300 font-mono">{fittingMetrics.innerRadius} mm</strong></span>
                          <span>Vnější rádius: <strong className="text-slate-300 font-mono">{fittingMetrics.outerRadius} mm</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HRANATÁ REDUKCE: Výstup A2 x B2 */}
                  {compType === 'Redukce' && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výstup Šířka A₂ (mm)</label>
                        <input
                          type="number"
                          value={width2}
                          onChange={e => setWidth2(parseInt(e.target.value) || 100)}
                          step="50"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Výstup Výška B₂ (mm)</label>
                        <input
                          type="number"
                          value={height2}
                          onChange={e => setHeight2(parseInt(e.target.value) || 100)}
                          step="50"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* HRANATÝ T-KUS: Odbočka */}
                  {(compType === 'T-Kus' || compType === 'Odbočka') && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Odbočka Šířka A_odb (mm)</label>
                        <input
                          type="number"
                          value={branchWidth}
                          onChange={e => setBranchWidth(parseInt(e.target.value) || 100)}
                          step="50"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Odbočka Výška B_odb (mm)</label>
                        <input
                          type="number"
                          value={branchHeight}
                          onChange={e => setBranchHeight(parseInt(e.target.value) || 100)}
                          step="50"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Příruba */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Přírubový profil</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['P20', 'P30', 'P40'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFlangeType(p)}
                          className={`py-1 rounded text-xs font-semibold border ${
                            flangeType === p ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          Příruba {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Odsazení / Etážka: Vyosení e */}
              {compType === 'Odsazení' && (
                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-300">Změna osy / Vyosení e (mm)</label>
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
                    <span className="font-mono font-bold text-cyan-400 text-xs w-16 text-right">{offsetMm} mm</span>
                  </div>
                </div>
              )}
            </div>

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
                  <option value="HLINIK">Hliníkový plech (AlMn)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tloušťka plechu (mm)</label>
                <select
                  value={sheetThickness}
                  onChange={e => setSheetThickness(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                >
                  <option value={0.6}>0.6 mm</option>
                  <option value={0.7}>0.7 mm</option>
                  <option value={0.8}>0.8 mm (Standard)</option>
                  <option value={0.9}>0.9 mm</option>
                  <option value={1.0}>1.0 mm (Zesílený)</option>
                  <option value={1.2}>1.2 mm</option>
                </select>
              </div>
            </div>

            {/* Accessories Checklist */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresAccessDoor}
                  onChange={e => setRequiresAccessDoor(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 bg-slate-900"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Revizní čistící dvířka (ČSN EN 12097)
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInsulation}
                  onChange={e => setHasInsulation(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 bg-slate-900"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Kročejová / tepelná izolace (Kaučuk / Orstech)
                </span>
              </label>
            </div>

            {/* Note input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Doplňující poznámka / Pozice na výkrese</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="např. 2.NP Stoupačka VZT-01, Koleno 90 st."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Submit Button */}
            <button
              id="btn-add-vzt-component"
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat {profileShape === 'KULATE' ? 'kruhové' : profileShape === 'PRECHOD' ? 'přechodku' : 'hranaté'} {compType} do kusovníku</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
