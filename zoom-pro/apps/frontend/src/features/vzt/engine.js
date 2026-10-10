// Zoom Pro — VZT výpočetní engine podle EU norem
import {
  AIR_PROPERTIES, DUCT_MATERIALS, IDA_CATEGORIES, BUILDING_TYPES, ROOM_TYPES,
  SOLAR_GAIN_WM2, HEAT_LOSS_COEFF_WKM3, FITTING_ZETA,
  hydraulicDiameterMm, frictionFactor, nearestStandardDiameter, nearestStandardRect,
} from './constants.js';

function n(v, fb = 0) { const p = Number(v); return Number.isFinite(p) ? p : fb; }
function r(v, d = 2) { return Number(Number(v).toFixed(d)); }

// ---- 1) Dimenzování průřezu pro daný průtok a rychlost ----
export function sizeDuctForFlow({ shape = 'round', flowM3h, maxVelocity = 5, fixedDim = null }) {
  const Q = n(flowM3h) / 3600; // m³/s
  const v = Math.max(n(maxVelocity), 0.5);
  const areaNeeded = Q / v; // m²

  if (shape === 'round') {
    const dRawMm = Math.sqrt((4 * areaNeeded) / Math.PI) * 1000;
    const dStd = nearestStandardDiameter(dRawMm);
    const areaActual = Math.PI * (dStd / 1000) ** 2 / 4;
    const vActual = Q / areaActual;
    return { shape, diameterMm: dStd, rawDiameterMm: r(dRawMm, 1), areaM2: r(areaActual, 4), velocityMs: r(vActual, 2), flowM3h: n(flowM3h) };
  }

  // rect: fixedDim = pevný rozměr (výška B). Dopočítat A
  const bMm = fixedDim || 250;
  const aRawMm = (areaNeeded / (bMm / 1000)) * 1000;
  const aStd = nearestStandardRect(aRawMm);
  const areaActual = (aStd / 1000) * (bMm / 1000);
  const vActual = Q / areaActual;
  return { shape, widthMm: aStd, heightMm: bMm, rawWidthMm: r(aRawMm, 1), areaM2: r(areaActual, 4), velocityMs: r(vActual, 2), flowM3h: n(flowM3h) };
}

// ---- 2) Tlaková ztráta úseku (třecí + místní) ----
export function pressureDropSegment({
  shape = 'round', diameterMm = 0, widthMm = 0, heightMm = 0,
  lengthM = 1, flowM3h = 0, material = 'galvanized_steel', fittings = [],
}) {
  const air = AIR_PROPERTIES;
  const mat = DUCT_MATERIALS[material] || DUCT_MATERIALS.galvanized_steel;
  const Q = n(flowM3h) / 3600;
  const dhMm = hydraulicDiameterMm(shape, shape === 'round' ? diameterMm : widthMm, shape === 'round' ? diameterMm : heightMm);
  const dhM = dhMm / 1000;
  const areaM2 = shape === 'round'
    ? Math.PI * (diameterMm / 1000) ** 2 / 4
    : (widthMm / 1000) * (heightMm / 1000);
  const v = areaM2 > 0 ? Q / areaM2 : 0;
  const reynolds = (v * dhM) / air.kinematicViscosityM2S;
  const lambda = frictionFactor(reynolds, mat.roughnessM, dhM || 0.001);
  const dynPressure = 0.5 * air.densityKgM3 * v * v; // Pa
  const frictionPa = lambda * (n(lengthM) / (dhM || 0.001)) * dynPressure;

  // Local losses from fittings — support {zeta, count} nebo přímou tlakovou ztrátu {paDirect}
  const localPa = (fittings || []).reduce((acc, f) => {
    if (f.paDirect != null) return acc + n(f.paDirect) * (n(f.count) || 1);
    const zeta = f.zeta != null ? n(f.zeta) : (FITTING_ZETA[f.type] || 0);
    return acc + zeta * (n(f.count) || 1) * dynPressure;
  }, 0);

  return {
    shape, dhMm: r(dhMm, 1), areaM2: r(areaM2, 4),
    velocityMs: r(v, 2), reynolds: Math.round(reynolds),
    frictionFactor: r(lambda, 4),
    dynamicPressurePa: r(dynPressure, 1),
    frictionPa: r(frictionPa, 1),
    localPa: r(localPa, 1),
    totalPa: r(frictionPa + localPa, 1),
  };
}

// ---- 3) Průtok potřebný pro místnost ----
export function requiredAirflowM3h({
  areaM2, heightM, occupants = 0, ida = 'IDA2', roomType = null, buildingType = null,
}) {
  const A = n(areaM2), H = n(heightM);
  const volume = A * H;

  // ACH podle typu místnosti nebo budovy
  let ach = 4;
  if (roomType && ROOM_TYPES[roomType]) ach = ROOM_TYPES[roomType].achRec;
  else if (buildingType && BUILDING_TYPES[buildingType]) ach = BUILDING_TYPES[buildingType].achDefault;

  const byAch = volume * ach;

  // Podle IDA (EN 13779): perPerson + perM2
  const idaCfg = IDA_CATEGORIES[ida] || IDA_CATEGORIES.IDA2;
  const byIda = occupants * idaCfg.perPersonM3h + A * idaCfg.perM2M3h;

  const design = Math.max(byAch, byIda);
  return {
    volumeM3: r(volume, 2),
    achUsed: ach,
    byAchM3h: Math.round(byAch),
    byIdaM3h: Math.round(byIda),
    designFlowM3h: Math.round(design),
    driver: byIda >= byAch ? 'IDA (EN 13779)' : 'ACH (typ místnosti)',
    idaCategory: ida,
  };
}

// ---- 4) Tepelná zátěž místnosti (chlazení + topení) — zjednodušený návrh ----
export function roomThermalLoads({
  areaM2, heightM, buildingType = 'office', orientation = 'S', outdoorWinterC = -12, indoorC = 22,
}) {
  const A = n(areaM2), H = n(heightM);
  const bt = BUILDING_TYPES[buildingType] || BUILDING_TYPES.office;
  const peopleW = A * bt.peoplePerM2 * 100;   // 100 W / os. senzibilní
  const equipmentW = A * bt.equipmentWm2;
  const lightingW = A * bt.lightingWm2;
  const solarW = A * (SOLAR_GAIN_WM2[orientation] || 50);

  const coolingKw = (peopleW + equipmentW + lightingW + solarW) / 1000;
  const heatingKw = (A * H * HEAT_LOSS_COEFF_WKM3 * (n(indoorC) - n(outdoorWinterC))) / 1000;

  return {
    peopleW: Math.round(peopleW),
    equipmentW: Math.round(equipmentW),
    lightingW: Math.round(lightingW),
    solarW: Math.round(solarW),
    coolingKw: r(coolingKw, 2),
    heatingKw: r(heatingKw, 2),
  };
}

// ---- 5) Sanity check rychlosti ----
export function velocityCheck(velocityMs, category = 'branch_duct') {
  const map = {
    main_duct:      [4, 8], branch_duct:  [2, 5], terminal_duct: [1.5, 3],
    low_noise:      [1, 2.5], extraction_kitchen: [5, 10],
  };
  const [min, max] = map[category] || [2, 5];
  if (velocityMs < min) return { level: 'warn', text: `Rychlost ${velocityMs} m/s je pod doporučeným minimem ${min} m/s.` };
  if (velocityMs > max) return { level: 'error', text: `Rychlost ${velocityMs} m/s překračuje ${max} m/s → hluk a ztráty.` };
  return { level: 'ok', text: `Rychlost ${velocityMs} m/s je v rozsahu ${min}–${max} m/s.` };
}
