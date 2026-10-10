// Zoom Pro — VZT konstanty podle norem EU
// Referenční normy:
//   EN 16798-1  (větrání v budovách — kategorie IEQ I..IV)
//   EN 13779    (větrání nebytových budov, kategorie IDA/ODA/SUP/ETA)
//   EN 12831    (návrh tepelné ztráty)
//   EN 12237    (kruhové Spiro potrubí, řady průměrů)
//   EN 1505     (hranaté kovové potrubí, řady rozměrů)
//   EN 1506     (kruhové kovové potrubí, řady průměrů)
//   EN 15251    (vnitřní prostředí — parametry návrhu)

export const STANDARD_ROUND_DIAMETERS_MM = [
  // EN 1506 / EN 12237
  63, 80, 100, 125, 140, 160, 180, 200, 224, 250, 280, 315,
  355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250,
];

export const STANDARD_RECT_SIZES_MM = [
  // EN 1505 základní řada rozměrů
  100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 2000,
];

export const DUCT_MATERIALS = {
  galvanized_steel: { label: 'Pozinkovaný plech', roughnessM: 0.00009,  thermalK: 50   },
  stainless_steel:  { label: 'Nerez',              roughnessM: 0.000015, thermalK: 16   },
  aluminum:         { label: 'Hliník',             roughnessM: 0.000030, thermalK: 205  },
  pvc:              { label: 'PVC / plast',        roughnessM: 0.000007, thermalK: 0.19 },
  flexible_duct:    { label: 'Flexi hadice',       roughnessM: 0.003,    thermalK: 0.04 },
  spiro:            { label: 'Spiro',              roughnessM: 0.00015,  thermalK: 50   },
};

export const AIR_PROPERTIES = {
  // vzduch 20 °C, 101 325 Pa
  densityKgM3: 1.2041,
  dynamicViscosityPaS: 1.825e-5,
  kinematicViscosityM2S: 1.516e-5,
  specificHeatJkgK: 1005,
};

// EN 13779: doporučená kategorie IDA (kvalita vnitřního vzduchu)
// [m³/h/os] pro nekuřácké prostředí — pro každou kategorii IDA 1..4
export const IDA_CATEGORIES = {
  IDA1: { label: 'IDA 1 — vysoká kvalita',     perPersonM3h: 72, perM2M3h: 3.6 },
  IDA2: { label: 'IDA 2 — střední (default)',  perPersonM3h: 45, perM2M3h: 2.5 },
  IDA3: { label: 'IDA 3 — mírná',               perPersonM3h: 29, perM2M3h: 1.4 },
  IDA4: { label: 'IDA 4 — nízká',               perPersonM3h: 18, perM2M3h: 0.7 },
};

// EN 16798-1 — návrhové hodnoty pro typy budov (přepočet)
export const BUILDING_TYPES = {
  office:      { label: 'Kancelář',        peoplePerM2: 0.10, equipmentWm2: 15, lightingWm2: 12, achDefault: 4 },
  residential: { label: 'Bydlení',         peoplePerM2: 0.04, equipmentWm2: 8,  lightingWm2: 8,  achDefault: 0.5 },
  retail:      { label: 'Obchod',          peoplePerM2: 0.20, equipmentWm2: 20, lightingWm2: 25, achDefault: 6 },
  restaurant:  { label: 'Restaurace',      peoplePerM2: 1.50, equipmentWm2: 40, lightingWm2: 18, achDefault: 8 },
  hospital:    { label: 'Nemocnice',       peoplePerM2: 0.15, equipmentWm2: 25, lightingWm2: 15, achDefault: 6 },
  school:      { label: 'Škola',           peoplePerM2: 0.50, equipmentWm2: 12, lightingWm2: 15, achDefault: 5 },
  industrial:  { label: 'Průmysl / hala',  peoplePerM2: 0.05, equipmentWm2: 60, lightingWm2: 10, achDefault: 2 },
};

// ACH doporučené výměny vzduchu za hodinu pro typy místností (EN 13779 / hygienická praxe)
export const ROOM_TYPES = {
  office:       { label: 'Kancelář',              achMin: 2,  achRec: 4,  achMax: 6  },
  meeting:      { label: 'Zasedačka',             achMin: 5,  achRec: 8,  achMax: 12 },
  wc:           { label: 'WC',                     achMin: 8,  achRec: 12, achMax: 15 },
  shower:       { label: 'Sprcha',                 achMin: 10, achRec: 15, achMax: 20 },
  kitchen:      { label: 'Kuchyň (běžná)',        achMin: 8,  achRec: 15, achMax: 30 },
  kitchen_hood: { label: 'Kuchyň s digestoří',    achMin: 15, achRec: 30, achMax: 60 },
  bedroom:      { label: 'Ložnice',                achMin: 1,  achRec: 2,  achMax: 4  },
  living:       { label: 'Obývací pokoj',          achMin: 2,  achRec: 4,  achMax: 6  },
  wardrobe:     { label: 'Šatna',                  achMin: 2,  achRec: 4,  achMax: 6  },
  garage:       { label: 'Garáž',                  achMin: 3,  achRec: 6,  achMax: 10 },
  sauna:        { label: 'Sauna',                  achMin: 6,  achRec: 10, achMax: 15 },
  wellness:     { label: 'Wellness / bazén',       achMin: 4,  achRec: 8,  achMax: 12 },
  server:       { label: 'Serverovna',             achMin: 15, achRec: 25, achMax: 40 },
  garage_public:{ label: 'Podzemní parking',       achMin: 3,  achRec: 6,  achMax: 10 },
  classroom:    { label: 'Učebna',                 achMin: 4,  achRec: 6,  achMax: 8  },
  workshop:     { label: 'Dílna / lakovna',        achMin: 6,  achRec: 12, achMax: 30 },
  restaurant_hall:{ label: 'Restaurace — hala',    achMin: 4,  achRec: 8,  achMax: 12 },
  operating_room:{ label: 'Operační sál',          achMin: 15, achRec: 25, achMax: 40 },
  laboratory:   { label: 'Laboratoř',              achMin: 6,  achRec: 12, achMax: 20 },
  technical:    { label: 'Technická místnost',    achMin: 4,  achRec: 8,  achMax: 12 },
};

// Doporučené rychlosti proudění (m/s) — EN 13779 / VDI 2081
export const VELOCITY_RECOMMENDED = {
  main_duct:      { min: 4,   max: 8,   note: 'Hlavní rozvod'         },
  branch_duct:    { min: 2,   max: 5,   note: 'Odbočka'               },
  terminal_duct:  { min: 1.5, max: 3,   note: 'Před koncovým prvkem'  },
  low_noise:      { min: 1,   max: 2.5, note: 'Tichý provoz (ložnice)' },
  extraction_kitchen:{ min: 5,max: 10,  note: 'Odsávání z digestoře'  },
};

// Kategorie prostředí IEQ dle EN 16798-1
export const IEQ_CATEGORIES = {
  I:   { label: 'I — vyšší (nemocnice, seniorské domy)', tempWinter: 22, tempSummer: 24.5, co2Max: 550 },
  II:  { label: 'II — normální (většina budov)',          tempWinter: 20, tempSummer: 26,   co2Max: 800 },
  III: { label: 'III — přijatelná',                        tempWinter: 18, tempSummer: 27,   co2Max: 1350 },
  IV:  { label: 'IV — pod normální (krátkodobě)',         tempWinter: 16, tempSummer: 28,   co2Max: 1750 },
};

// Solární zisky W/m² (návrh, střed. Evropa) — dle orientace
export const SOLAR_GAIN_WM2 = { N: 50, S: 150, E: 100, W: 120, NE: 70, NW: 70, SE: 130, SW: 130 };

// EN 12831 - koeficient prostupu tepla pro rychlý odhad tepelné ztráty (W/K/m³)
export const HEAT_LOSS_COEFF_WKM3 = 0.33; // objemové ztráty větráním

// Ekvivalentní hydraulický průměr — pro tlakové ztráty
export function hydraulicDiameterMm(shape, aMm, bMm) {
  if (shape === 'round') return aMm;
  if (!aMm || !bMm) return 0;
  // pro obdélníkový: Dh = 2·A·B/(A+B)  (EN 13779)
  return (2 * aMm * bMm) / (aMm + bMm);
}

// Colebrook (řešeno iteračně) pro součinitel tření λ
export function frictionFactor(reynolds, roughnessM, dhM) {
  if (reynolds < 2300) return 64 / Math.max(reynolds, 1);
  const relRough = roughnessM / dhM;
  let lambda = 0.02;
  for (let i = 0; i < 30; i++) {
    const rhs = -2 * Math.log10(relRough / 3.7 + 2.51 / (reynolds * Math.sqrt(lambda)));
    const next = 1 / (rhs * rhs);
    if (Math.abs(next - lambda) < 1e-6) return next;
    lambda = next;
  }
  return lambda;
}

// Zeta hodnoty typových tvarovek (VDI 2087 / ASHRAE Handbook)
export const FITTING_ZETA = {
  elbow_90_round:  0.30,
  elbow_45_round:  0.15,
  elbow_90_rect:   0.35,
  elbow_45_rect:   0.20,
  tee_branch:      1.20,
  tee_straight:    0.30,
  reducer:         0.20,
  expansion:       0.35,
  entry:           1.00,
  outlet:          1.00,
  damper_open:     0.20,
  filter_g4:       50,   // Pa (přímo tlaková ztráta)
  filter_f7:       120,  // Pa
  filter_h13:      250,  // Pa
};

export function nearestStandardDiameter(mm) {
  return STANDARD_ROUND_DIAMETERS_MM.reduce((prev, curr) =>
    Math.abs(curr - mm) < Math.abs(prev - mm) ? curr : prev, STANDARD_ROUND_DIAMETERS_MM[0]);
}

export function nearestStandardRect(mm) {
  return STANDARD_RECT_SIZES_MM.reduce((prev, curr) =>
    Math.abs(curr - mm) < Math.abs(prev - mm) ? curr : prev, STANDARD_RECT_SIZES_MM[0]);
}
