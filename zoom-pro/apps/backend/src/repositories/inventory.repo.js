import { query, withTransaction } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';

const INCREASE_TYPES = new Set(['RECEIPT', 'RETURN']);
const DECREASE_TYPES = new Set(['ISSUE', 'TRANSFER', 'WRITE_OFF']);

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const inventoryRepo = {
  createItem({ companyId, name, code, quantity, unit, minQuantity, location, supplierId, purchasePrice, sellPrice, category }) {
    return query(
      `INSERT INTO "InventoryItem" (
        id, "companyId", name, code, quantity, unit, "minQuantity", location, "supplierId", "purchasePrice", "sellPrice", category, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, NULLIF($3, ''), $4, $5, $6, NULLIF($7, ''), NULLIF($8, ''), $9, $10, NULLIF($11, ''), NOW(), NOW()
      )
      RETURNING *`,
      [
        companyId,
        name,
        code || '',
        n(quantity),
        unit,
        n(minQuantity),
        location || '',
        supplierId || '',
        purchasePrice === undefined || purchasePrice === null || purchasePrice === '' ? null : n(purchasePrice),
        sellPrice === undefined || sellPrice === null || sellPrice === '' ? null : n(sellPrice),
        category || ''
      ]
    );
  },

  createMovement({ companyId, itemId, type, quantity, projectId, note, documentRef, createdBy }) {
    return withTransaction(async (client) => {
      const itemResult = await client.query(
        'SELECT * FROM "InventoryItem" WHERE id = $1 AND "companyId" = $2 FOR UPDATE',
        [itemId, companyId]
      );

      const item = itemResult.rows[0];
      if (!item) {
        throw new HttpError(404, 'Materiál nebyl nalezen');
      }

      const rawQuantity = n(quantity);
      let delta = rawQuantity;
      if (DECREASE_TYPES.has(type)) delta = -Math.abs(rawQuantity);
      if (INCREASE_TYPES.has(type)) delta = Math.abs(rawQuantity);
      if (type === 'ADJUSTMENT') delta = rawQuantity;

      const quantityBefore = n(item.quantity);
      const quantityAfter = quantityBefore + delta;

      if (quantityAfter < 0) {
        throw new HttpError(400, `Na skladě není dostatek materiálu (${item.name})`);
      }

      const movementResult = await client.query(
        `INSERT INTO "InventoryMovement" (
          id, "companyId", "itemId", type, quantity, "quantityBefore", "quantityAfter", "projectId", note, "documentRef", "createdBy", "createdAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3::inventory_movement_type_enum, $4, $5, $6, $7, NULLIF($8, ''), NULLIF($9, ''), $10, NOW()
        )
        RETURNING *`,
        [companyId, itemId, type, delta, quantityBefore, quantityAfter, projectId || null, note || '', documentRef || '', createdBy]
      );

      await client.query(
        'UPDATE "InventoryItem" SET quantity = $3, "updatedAt" = NOW() WHERE id = $1 AND "companyId" = $2',
        [itemId, companyId, quantityAfter]
      );

      return {
        movement: movementResult.rows[0],
        item: {
          ...item,
          quantity: quantityAfter,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }
};
