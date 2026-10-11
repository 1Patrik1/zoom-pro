import { describe, expect, it } from 'vitest';
import {
  calculateComponentMetrics,
  calculateDimensionFromFlow,
  calculateOffsetPiece,
  calculatePressureDrop,
  computeAreaM2,
  computeHydraulicDiameterM,
  computePerimeterM,
  normalizeGeometry,
  buildSavePayload
} from '../calculations.js';

describe('VZT calculation engine', () => {
  it('converts circular and rectangular geometry from mm to m correctly', () => {
    expect(computeAreaM2('round', 200)).toBeCloseTo(Math.PI * 0.2 ** 2 / 4, 6);
    expect(computePerimeterM('round', 200)).toBeCloseTo(Math.PI * 0.2, 6);
    expect(computeAreaM2('rect', 500, 300)).toBeCloseTo(0.15, 6);
    expect(computeHydraulicDiameterM('rect', 500, 300)).toBeCloseTo(0.375, 6);
  });

  it('normalizes form geometry and prevents negative dimensions', () => {
    expect(normalizeGeometry({ width: '500', height: '300', length: -25 })).toMatchObject({ width: 500, height: 300, length: 0 });
    expect(computeAreaM2('rect', -100, 300)).toBe(0);
  });

  it('sizes a duct using Q[m3/s] = flow[m3/h] / 3600 and the target velocity', () => {
    const result = calculateDimensionFromFlow({ medium: 'vzt', flowM3h: 500, targetVelocity: 3.5, aspectRatio: 2 });
    expect(result.areaRequiredM2).toBeCloseTo((500 / 3600) / 3.5, 4);
    expect(result.roundDiameterMm).toBeGreaterThan(0);
    expect(result.rectWidthMm).toBeGreaterThan(result.rectHeightMm);
  });

  it('keeps pressure loss finite and non-negative for air, water and heating', () => {
    for (const medium of ['vzt', 'water', 'heating']) {
      const result = calculatePressureDrop({ medium, shape: 'round', diameter: 200, flowM3h: 500, lengthM: 10, elbows90: 2 });
      expect(result.velocityMS).toBeGreaterThan(0);
      expect(result.totalLossPa).toBeGreaterThan(0);
      expect(Number.isFinite(result.totalLossPa)).toBe(true);
    }
    const invalid = calculatePressureDrop({ diameter: -200, flowM3h: -500, lengthM: -10 });
    expect(invalid.totalLossPa).toBe(0);
  });

  it('calculates material metrics and persists the same displayed area and weight', () => {
    const form = { systemType: 'VZT', shape: 'rect', componentKind: 'straight', width: 500, height: 300, width2: 500, height2: 300, length: 1200, angle: 45, offset: 0, radiusRatio: 1 };
    const metrics = calculateComponentMetrics(form);
    const payload = buildSavePayload(form, metrics);
    expect(metrics.surfaceAreaM2).toBeCloseTo(1.6 * 1.2 * 1.15, 2);
    expect(payload.surfaceArea).toBe(metrics.surfaceAreaM2);
    expect(payload.weight).toBe(metrics.weightKg);
    expect(payload.estimatedScrews).toBe(metrics.estimatedScrews);
  });

  it('solves an offset segment and guards impossible/negative geometry', () => {
    const result = calculateOffsetPiece({ shape: 'round', diameter: 200, offset: 300, angleDeg: 45 });
    expect(result.pieceLengthMm).toBeGreaterThan(0);
    expect(result.totalAssemblyWeightKg).toBeGreaterThan(result.weightKg);
    const fixedRun = calculateOffsetPiece({ shape: 'round', diameter: 200, angleDeg: 45, totalAxialMm: 1000, flangeAllowance: 10 });
    expect(fixedRun.totalAxialMm).toBe(1000);
    const invalid = calculateOffsetPiece({ shape: 'rect', width: -500, height: -300, offset: -100 });
    expect(invalid.surfaceAreaM2).toBe(0);
    expect(Number.isFinite(invalid.pieceLengthMm)).toBe(true);
  });
});
