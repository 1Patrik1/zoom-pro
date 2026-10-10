const STEEL_DENSITY = 7.85;
const WEIGHT_COEFFICIENT = 0.9;
const SHEET_RESERVE_FACTOR = 1.15;

export const MEDIUM_PRESETS = {
  vzt: {
    label: 'VZT / vzduch',
    density: 1.2,
    viscosity: 1.81e-5,
    roughness: 0.00015,
    recommendedVelocity: 'hlavní tah 4–6 m/s, odbočky 2–4 m/s'
  },
  water: {
    label: 'Voda',
    density: 998,
    viscosity: 0.001,
    roughness: 0.000045,
    recommendedVelocity: '0.8–1.8 m/s'
  },
  heating: {
    label: 'Topení',
    density: 983,
    viscosity: 0.00047,
    roughness: 0.000045,
    recommendedVelocity: '0.4–1.2 m/s'
  }
};

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

export function normalizeGeometry(inputs) {
  const shape = inputs.shape || 'rect';
  const width = n(shape === 'round' ? inputs.diameter : inputs.width);
  const height = n(shape === 'round' ? inputs.diameter : inputs.height || inputs.width);
  const width2 = n(shape === 'round' ? inputs.diameter2 || inputs.diameter : inputs.width2 || inputs.width);
  const height2 = n(shape === 'round' ? inputs.diameter2 || inputs.diameter : inputs.height2 || inputs.height || inputs.width);
  const length = n(inputs.length);
  const angle = n(inputs.angle);
  const offset = n(inputs.offset);
  const radiusRatio = Math.max(n(inputs.radiusRatio, 1.0), 0.6);
  return { shape, width, height, width2, height2, length, angle, offset, radiusRatio };
}

export function computeAreaM2(shape, widthMm, heightMm) {
  const widthM = widthMm / 1000;
  const heightM = heightMm / 1000;
  if (!widthM || !heightM) return 0;
  if (shape === 'round') {
    return Math.PI * Math.pow(widthM, 2) / 4;
  }
  return widthM * heightM;
}

export function computePerimeterM(shape, widthMm, heightMm) {
  const widthM = widthMm / 1000;
  const heightM = heightMm / 1000;
  if (!widthM || !heightM) return 0;
  if (shape === 'round') {
    return Math.PI * widthM;
  }
  return 2 * (widthM + heightM);
}

export function computeHydraulicDiameterM(shape, widthMm, heightMm) {
  const area = computeAreaM2(shape, widthMm, heightMm);
  const perimeter = computePerimeterM(shape, widthMm, heightMm);
  if (!area || !perimeter) return 0;
  return (4 * area) / perimeter;
}

function computeTransitionDeltaM(shape, widthMm, heightMm, width2Mm, height2Mm) {
  if (shape === 'round') {
    return Math.abs((width2Mm - widthMm) / 2000);
  }
  const dw = Math.abs((width2Mm - widthMm) / 2000);
  const dh = Math.abs((height2Mm - heightMm) / 2000);
  return Math.sqrt((dw ** 2) + (dh ** 2));
}

export function calculateComponentMetrics(rawInputs) {
  const inputs = normalizeGeometry(rawInputs);
  const {
    shape, width, height, width2, height2, length, angle, offset, radiusRatio
  } = inputs;

  const componentKind = rawInputs.componentKind || 'straight';
  const lengthM = length / 1000;
  const offsetM = offset / 1000;
  const areaStartM2 = computeAreaM2(shape, width, height);
  const areaEndM2 = computeAreaM2(shape, width2, height2);
  const perimeterStartM = computePerimeterM(shape, width, height);
  const perimeterEndM = computePerimeterM(shape, width2, height2);
  const hydraulicDiameterM = computeHydraulicDiameterM(shape, width, height);
  const avgPerimeterM = (perimeterStartM + perimeterEndM) / 2;
  const sizeForBendMm = shape === 'round' ? width : Math.max(width, height);
  const centerRadiusM = (sizeForBendMm / 1000) * radiusRatio;
  const angleRad = (Math.PI / 180) * angle;

  let centerLengthM = lengthM;
  let innerDevelopedM = lengthM;
  let outerDevelopedM = lengthM;
  let slantLengthM = lengthM;

  if (componentKind === 'elbow' && angle > 0) {
    centerLengthM = centerRadiusM * angleRad;
    const halfSizeM = (sizeForBendMm / 1000) / 2;
    innerDevelopedM = Math.max((centerRadiusM - halfSizeM) * angleRad, 0);
    outerDevelopedM = (centerRadiusM + halfSizeM) * angleRad;
    slantLengthM = centerLengthM;
  }

  if (componentKind === 'offset' || componentKind === 'transition') {
    const sizeDeltaM = computeTransitionDeltaM(shape, width, height, width2, height2);
    slantLengthM = Math.sqrt((lengthM ** 2) + (offsetM ** 2) + (sizeDeltaM ** 2));
    centerLengthM = Math.sqrt((lengthM ** 2) + (offsetM ** 2));
    innerDevelopedM = lengthM;
    outerDevelopedM = slantLengthM;
  }

  const shellLengthM = componentKind === 'straight' ? lengthM : (componentKind === 'elbow' ? centerLengthM : slantLengthM);
  const surfaceAreaM2 = avgPerimeterM * shellLengthM * SHEET_RESERVE_FACTOR;
  const weightKg = surfaceAreaM2 * STEEL_DENSITY * WEIGHT_COEFFICIENT;
  const requiresAccessDoor = (componentKind === 'straight' && lengthM >= 4) || (componentKind === 'elbow' && angle >= 45) || hydraulicDiameterM >= 0.6;

  const estimatedScrews = Math.max(8, Math.ceil(avgPerimeterM * 12));
  const estimatedTapeM = avgPerimeterM * (componentKind === 'straight' ? 1 : 1.5);
  const estimatedRivets = Math.max(0, Math.ceil(avgPerimeterM * 8));
  const estimatedSealantKg = shape === 'round' ? 0.15 * shellLengthM : 0.22 * shellLengthM;

  return {
    ...inputs,
    componentKind,
    areaStartM2: round(areaStartM2, 4),
    areaEndM2: round(areaEndM2, 4),
    perimeterStartM: round(perimeterStartM, 3),
    perimeterEndM: round(perimeterEndM, 3),
    hydraulicDiameterM: round(hydraulicDiameterM, 4),
    centerRadiusM: round(centerRadiusM, 3),
    centerLengthM: round(centerLengthM, 3),
    innerDevelopedM: round(innerDevelopedM, 3),
    outerDevelopedM: round(outerDevelopedM, 3),
    slantLengthM: round(slantLengthM, 3),
    surfaceAreaM2: round(surfaceAreaM2, 2),
    weightKg: round(weightKg, 2),
    requiresAccessDoor,
    estimatedScrews,
    estimatedTapeM: round(estimatedTapeM, 2),
    estimatedRivets,
    estimatedSealantKg: round(estimatedSealantKg, 2)
  };
}

export function calculateDimensionFromFlow({ medium, flowM3h, targetVelocity, aspectRatio = 2 }) {
  const flowM3s = n(flowM3h) / 3600;
  const velocity = Math.max(n(targetVelocity), 0.1);
  const areaRequiredM2 = flowM3s / velocity;
  const diameterM = Math.sqrt((4 * areaRequiredM2) / Math.PI);
  const ratio = Math.max(n(aspectRatio, 2), 1);
  const rectHeightM = Math.sqrt(areaRequiredM2 / ratio);
  const rectWidthM = rectHeightM * ratio;
  const equivalentRoundM = (rectWidthM + rectHeightM) > 0
    ? 1.3 * Math.pow(rectWidthM * rectHeightM, 0.625) / Math.pow(rectWidthM + rectHeightM, 0.25)
    : 0;

  return {
    medium,
    flowM3h: n(flowM3h),
    targetVelocity: velocity,
    areaRequiredM2: round(areaRequiredM2, 4),
    roundDiameterMm: Math.round(diameterM * 1000),
    rectWidthMm: Math.round(rectWidthM * 1000 / 50) * 50,
    rectHeightMm: Math.round(rectHeightM * 1000 / 50) * 50,
    equivalentRoundMm: Math.round(equivalentRoundM * 1000)
  };
}

export function calculatePressureDrop({
  medium = 'vzt',
  shape = 'round',
  width,
  height,
  diameter,
  flowM3h,
  lengthM,
  elbows90 = 0,
  elbows45 = 0,
  tees = 0,
  valves = 0,
  reducers = 0,
  roughness
}) {
  const preset = MEDIUM_PRESETS[medium] || MEDIUM_PRESETS.vzt;
  const dimWidth = shape === 'round' ? n(diameter) : n(width);
  const dimHeight = shape === 'round' ? n(diameter) : n(height || width);
  const area = computeAreaM2(shape, dimWidth, dimHeight);
  const dh = computeHydraulicDiameterM(shape, dimWidth, dimHeight);
  const flowM3s = n(flowM3h) / 3600;
  const velocity = area > 0 ? flowM3s / area : 0;
  const reynolds = preset.viscosity > 0 ? (preset.density * velocity * dh) / preset.viscosity : 0;
  const eps = n(roughness, preset.roughness);

  let frictionFactor = 0;
  if (reynolds > 0 && reynolds < 2300) {
    frictionFactor = 64 / reynolds;
  } else if (reynolds >= 2300 && dh > 0) {
    frictionFactor = 0.25 / Math.pow(Math.log10((eps / (3.7 * dh)) + (5.74 / Math.pow(reynolds, 0.9))), 2);
  }

  const dynamicPressurePa = 0.5 * preset.density * velocity * velocity;
  const straightLossPa = dh > 0 ? frictionFactor * (n(lengthM) / dh) * dynamicPressurePa : 0;
  const zetaTotal = (0.9 * n(elbows90)) + (0.4 * n(elbows45)) + (1.8 * n(tees)) + (0.2 * n(valves)) + (0.25 * n(reducers));
  const fittingLossPa = zetaTotal * dynamicPressurePa;
  const totalLossPa = straightLossPa + fittingLossPa;

  const suggested = preset.recommendedVelocity;
  let recommendation = 'Rychlost je v přijatelném rozsahu.';
  if (medium === 'vzt' && velocity > 7) recommendation = 'Rychlost je vysoká, čekej vyšší hluk i tlakovou ztrátu.';
  if ((medium === 'water' || medium === 'heating') && velocity > 2) recommendation = 'Rychlost je pro kapalinu vysoká, zvaž větší dimenzi.';
  if ((medium === 'water' || medium === 'heating') && velocity < 0.25) recommendation = 'Rychlost je nízká, může hrozit špatné odvzdušnění / přenos.';

  return {
    medium,
    shape,
    areaM2: round(area, 4),
    hydraulicDiameterM: round(dh, 4),
    velocityMS: round(velocity, 3),
    reynolds: Math.round(reynolds),
    frictionFactor: round(frictionFactor, 4),
    dynamicPressurePa: round(dynamicPressurePa, 2),
    straightLossPa: round(straightLossPa, 2),
    fittingLossPa: round(fittingLossPa, 2),
    totalLossPa: round(totalLossPa, 2),
    totalLossPerMeterPa: n(lengthM) > 0 ? round(totalLossPa / n(lengthM), 2) : 0,
    zetaTotal: round(zetaTotal, 2),
    recommendedVelocity: suggested,
    recommendation
  };
}

/**
 * Výpočet mezikusu (rovného segmentu) mezi dvěma 45° koleny pro změnu osy.
 * Geometrie: dvě 45° kolena zapojená proti sobě vytvoří Z-přesah (offset)
 * s vodorovnou vzdáleností mezi koncovými přírubami = L_total a příčným posunem = offset.
 *
 * Pro 45° kolena:
 *   - projekce ohybu na osu potrubí = R_center (protože sin(45°)/cos(45°) trik při 45°)
 *   - vodorovná projekce délky mezikusu = piece_len * cos(45°)
 *   - svislý přesah způsobený jedním kolenem = R_center * (1 - cos(45°)) na příruce
 *     + piece_len * sin(45°) rozdíl mezi konci mezikusu
 *
 * Vstupy (mm):
 *   shape: 'round' | 'rect'
 *   width, height (u hranatého) NEBO diameter (u kulatého)
 *   offset: požadovaná změna osy (mm)
 *   radiusRatio: R_center / rozměr (default 1.0)
 *   flangeAllowance: přídavek na příruby/lem (mm, default 0)
 *   L_total (optional): pokud zadáno, dopočítá se mezikus místo osy
 *
 * Výstup (mm/m):
 *   pieceLengthMm    – délka rovného mezikusu (řezaný kus)
 *   pieceLengthNetMm – délka mezikusu po odečtení přídavku na příruby
 *   totalAxialMm     – celková osová délka sestavy (kolen + mezikus + kolen)
 *   projectedRunMm   – vodorovná projekce (osa hlavního směru)
 *   elbowCenterRadiusMm – R kolena (podle radiusRatio)
 *   elbowSideMm      – projekce jednoho 45° kolena na osu
 *   diagonalMm       – délka po diagonále (skloněná osa mezikusu)
 *   surfaceAreaM2    – plocha plechu na mezikus
 *   weightKg         – hmotnost mezikusu
 */
/**
 * Univerzální mezikus mezi dvěma stejnými koleny o zadaném úhlu.
 * Podporované úhly: 15°, 30°, 45°, 60° (obecně 5°–75°).
 *
 * Geometrie: dvě kolena zapojená proti sobě přenášejí osu o
 *   offset_total = 2·R·(1 - cos α) + L · sin α
 *   projected    = 2·R·sin α       + L · cos α
 * kde α je úhel kolena, R je poloměr střednice kolena a L je délka rovného mezikusu.
 *
 * Vzoreček pro řezaný mezikus:
 *   L = (offset - 2·R·(1 - cos α)) / sin α
 */
export function calculateOffsetPiece({
  shape = 'round',
  width = 0,
  height = 0,
  diameter = 0,
  offset = 0,
  angleDeg = 45,
  radiusRatio = 1.0,
  flangeAllowance = 0,
  totalAxialMm = null
}) {
  const w = shape === 'round' ? n(diameter) : n(width);
  const h = shape === 'round' ? n(diameter) : n(height || width);
  const size = shape === 'round' ? w : Math.max(w, h);
  const ratio = Math.max(n(radiusRatio, 1.0), 0.6);
  const R = size * ratio;

  // Bezpečně omezený úhel
  const alphaDeg = Math.min(Math.max(n(angleDeg, 45), 5), 75);
  const alpha = (alphaDeg * Math.PI) / 180;
  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);

  const twoElbowsOffset = 2 * R * (1 - cosA);
  const twoElbowsProjected = 2 * R * sinA;

  let pieceLengthMm = 0;
  let projectedRunMm = 0;
  const off = n(offset);

  if (totalAxialMm && n(totalAxialMm) > twoElbowsProjected) {
    pieceLengthMm = (n(totalAxialMm) - twoElbowsProjected) / cosA;
    projectedRunMm = n(totalAxialMm);
  } else if (off > twoElbowsOffset) {
    pieceLengthMm = (off - twoElbowsOffset) / sinA;
    projectedRunMm = twoElbowsProjected + pieceLengthMm * cosA;
  } else {
    pieceLengthMm = 0;
    projectedRunMm = twoElbowsProjected;
  }

  const pieceLengthNetMm = Math.max(0, pieceLengthMm - 2 * n(flangeAllowance));
  const diagonalMm = Math.sqrt(off * off + projectedRunMm * projectedRunMm);

  const perimeterM = computePerimeterM(shape, w, h);
  const surfaceAreaM2 = perimeterM * (pieceLengthMm / 1000) * SHEET_RESERVE_FACTOR;
  const weightKg = surfaceAreaM2 * STEEL_DENSITY * WEIGHT_COEFFICIENT;

  // Rozvin (délka luku) kolena po střednici
  const elbowArcMm = R * alpha;
  const elbowSurfaceM2 = (perimeterM * elbowArcMm) / 1000 * SHEET_RESERVE_FACTOR;
  const elbowWeightKg = elbowSurfaceM2 * STEEL_DENSITY * WEIGHT_COEFFICIENT;

  const minimumOffsetPossibleMm = Math.round(twoElbowsOffset);
  const canRealize = pieceLengthMm > 0 || off <= twoElbowsOffset + 0.5;
  const warning = off < twoElbowsOffset
    ? `Požadovaný přesah ${off} mm je menší než minimální (${minimumOffsetPossibleMm} mm) pro ${alphaDeg}° kolena. Zvol menší úhel nebo menší R.`
    : null;

  // Doporučené normalizované úhly a hint který nejlépe sedí
  const suggestions = [15, 30, 45, 60].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const min = 2 * R * (1 - Math.cos(a));
    return { angleDeg: deg, minOffsetMm: Math.round(min), fits: off >= min };
  });

  return {
    shape,
    angleDeg: alphaDeg,
    inputs: { width: w, height: h, offset: off, radiusRatio: ratio, flangeAllowance: n(flangeAllowance) },
    elbowCenterRadiusMm: round(R, 1),
    elbowArcMm: round(elbowArcMm, 1),
    elbowSideMm: round(R * sinA, 1),
    elbowRunMm: round(R * (1 - cosA), 1),
    elbowSurfaceM2: round(elbowSurfaceM2, 3),
    elbowWeightKg: round(elbowWeightKg, 2),
    pieceLengthMm: round(pieceLengthMm, 1),
    pieceLengthNetMm: round(pieceLengthNetMm, 1),
    totalAxialMm: round(2 * R * sinA + pieceLengthMm * cosA + 2 * n(flangeAllowance), 1),
    projectedRunMm: round(projectedRunMm, 1),
    diagonalMm: round(diagonalMm, 1),
    minimumOffsetPossibleMm,
    surfaceAreaM2: round(surfaceAreaM2, 3),
    weightKg: round(weightKg, 2),
    totalAssemblyWeightKg: round(weightKg + 2 * elbowWeightKg, 2),
    totalAssemblySurfaceM2: round(surfaceAreaM2 + 2 * elbowSurfaceM2, 3),
    canRealize,
    warning,
    suggestions,
    formula: `L = (offset − 2·R·(1 − cos ${alphaDeg}°)) / sin ${alphaDeg}°`
  };
}

// Zpětná kompatibilita
export function calculate45OffsetPiece(params) {
  return calculateOffsetPiece({ ...params, angleDeg: 45 });
}

export function buildSavePayload(formValues, metrics) {
  return {
    type: `${formValues.systemType} | ${formValues.shape === 'round' ? 'Kruhové' : 'Hranaté'} | ${formValues.componentKind}`,
    width: metrics.width,
    height: metrics.height,
    width2: metrics.width2,
    height2: metrics.height2,
    length: metrics.length,
    angle: metrics.angle,
    offset: metrics.offset,
    note: [
      `Systém: ${formValues.systemType}`,
      `Tvar: ${formValues.shape === 'round' ? 'Kruhové' : 'Hranaté'}`,
      `Prvek: ${formValues.componentKind}`,
      `Osa: ${metrics.offset} mm`,
      `Střední délka: ${metrics.centerLengthM} m`,
      `Vnitřní doměr: ${metrics.innerDevelopedM} m`,
      `Vnější doměr: ${metrics.outerDevelopedM} m`,
      `Rozvinutá délka: ${metrics.slantLengthM} m`
    ].join(' | ')
  };
}
