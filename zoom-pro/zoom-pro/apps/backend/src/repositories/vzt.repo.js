import { withTransaction } from '../config/db.js';

function perimeterMeters(widthMm, heightMm, isRound) {
  const w = Number(widthMm) / 1000;
  const h = Number(heightMm || widthMm) / 1000;
  if (isRound) return Math.PI * w;
  return 2 * (w + h);
}

function areaMeters(widthMm, heightMm, isRound) {
  const w = Number(widthMm) / 1000;
  const h = Number(heightMm || widthMm) / 1000;
  if (isRound) return Math.PI * Math.pow(w, 2) / 4;
  return w * h;
}

export const vztRepo = {
  async createComponentAndUpdateConsumables({ companyId, type, width, height, width2, height2, length, angle, offset, note }) {
    return withTransaction(async (client) => {
      const W = Number(width || 0);
      const H = Number(height || width || 0);
      const W2 = Number(width2 || width || 0);
      const H2 = Number(height2 || height || width || 0);
      const L = Number(length) / 1000;
      const angleNumber = Number(angle || 0);
      const offsetNumber = Number(offset || 0);
      const isRound = /kruhov|round|Ø/i.test(String(type));
      const isElbow = /koleno|elbow/i.test(String(type));
      const isOffset = /odsazení|offset/i.test(String(type));
      const isTransition = /přechod|redukce|transition/i.test(String(type));

      const perimeterStart = perimeterMeters(W, H, isRound);
      const perimeterEnd = perimeterMeters(W2, H2, isRound);
      const avgPerimeter = (perimeterStart + perimeterEnd) / 2;
      const areaStart = areaMeters(W, H, isRound);
      const areaEnd = areaMeters(W2, H2, isRound);
      const sizeBaseM = (isRound ? W : Math.max(W, H)) / 1000;
      const centerRadius = sizeBaseM;
      const centerArcLength = centerRadius * ((Math.PI / 180) * angleNumber);
      const sizeDelta = isRound ? Math.abs((W2 - W) / 2000) : Math.sqrt(Math.pow((W2 - W) / 2000, 2) + Math.pow((H2 - H) / 2000, 2));
      const slantLength = Math.sqrt(Math.pow(L, 2) + Math.pow(offsetNumber / 1000, 2) + Math.pow(sizeDelta, 2));
      const shellLength = isElbow ? centerArcLength : ((isOffset || isTransition) ? slantLength : L);
      const area = avgPerimeter * shellLength * 1.15;
      const weight = area * 7.85 * 0.9;
      const hydraulicDiameter = avgPerimeter > 0 ? (4 * ((areaStart + areaEnd) / 2)) / avgPerimeter : 0;
      const requiresAccessDoor = (L >= 4) || angleNumber >= 45 || hydraulicDiameter >= 0.6;
      const screws = Math.max(8, Math.ceil(avgPerimeter * 12));
      const tapeMeters = Number((avgPerimeter * (isElbow ? 1.5 : 1.0)).toFixed(2));
      const rivets = Math.max(0, Math.ceil(avgPerimeter * 8));
      const sealant = Number(((isRound ? 0.15 : 0.22) * shellLength).toFixed(2));

      const component = await client.query(
        `INSERT INTO "VztComponent" (
          id, "companyId", type, width, height, width2, height2, length, angle, "offset",
          "surfaceArea", weight, "requiresAccessDoor", note, "createdAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, NOW()
        ) RETURNING *`,
        [
          companyId,
          type,
          W || null,
          H || null,
          W2 || null,
          H2 || null,
          Number(length),
          angleNumber || null,
          offsetNumber || null,
          Number(area.toFixed(2)),
          Number(weight.toFixed(2)),
          requiresAccessDoor,
          note || null
        ]
      );

      await client.query(
        `INSERT INTO "ConsumablesSummary" (id, "companyId", "totalScrews", "totalTapeMeters", "totalRivets", "totalSealant", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
         ON CONFLICT ("companyId")
         DO UPDATE SET
           "totalScrews" = "ConsumablesSummary"."totalScrews" + EXCLUDED."totalScrews",
           "totalTapeMeters" = "ConsumablesSummary"."totalTapeMeters" + EXCLUDED."totalTapeMeters",
           "totalRivets" = "ConsumablesSummary"."totalRivets" + EXCLUDED."totalRivets",
           "totalSealant" = "ConsumablesSummary"."totalSealant" + EXCLUDED."totalSealant",
           "updatedAt" = NOW()`,
        [companyId, screws, tapeMeters, rivets, sealant]
      );

      return component.rows[0];
    });
  }
};
