import { withTransaction } from '../config/db.js';

export const vztRepo = {
  async createComponentAndUpdateConsumables({ companyId, type, width, height, length, angle }) {
    return withTransaction(async (client) => {
      const L = Number(length) / 1000;
      const W = Number(width) / 1000;
      const H = Number(height) / 1000;
      const area = 2 * (W + H) * L * 1.15;
      const weight = area * 7.85 * 0.9;
      const requiresAccessDoor = (type === 'Rovné' && L >= 4) || (type === 'Koleno' && Number(angle || 0) >= 45);

      const component = await client.query(
        `INSERT INTO "VztComponent" (
          id, "companyId", type, width, height, length, angle,
          "surfaceArea", weight, "requiresAccessDoor", "createdAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6,
          $7, $8, $9, NOW()
        ) RETURNING *`,
        [companyId, type, width, height, length, angle || null, Number(area.toFixed(2)), Number(weight.toFixed(2)), requiresAccessDoor]
      );

      await client.query(
        `INSERT INTO "ConsumablesSummary" (id, "companyId", "totalScrews", "totalTapeMeters", "updatedAt")
         VALUES (gen_random_uuid(), $1, 8, $2, NOW())
         ON CONFLICT ("companyId")
         DO UPDATE SET
           "totalScrews" = "ConsumablesSummary"."totalScrews" + 8,
           "totalTapeMeters" = "ConsumablesSummary"."totalTapeMeters" + EXCLUDED."totalTapeMeters",
           "updatedAt" = NOW()`,
        [companyId, Number((((W + H) * 2)).toFixed(1))]
      );

      return component.rows[0];
    });
  }
};
