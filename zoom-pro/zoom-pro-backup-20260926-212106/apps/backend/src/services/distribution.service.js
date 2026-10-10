import { query } from '../config/db.js';

async function listCatalog(companyId, { search = '', category = '' } = {}) {
  const where = ['"companyId" = $1'];
  const params = [companyId];
  if (search) { params.push(`%${search}%`); where.push(`(sku ILIKE $${params.length} OR name ILIKE $${params.length})`); }
  if (category) { params.push(category); where.push(`category = $${params.length}`); }
  const result = await query(`SELECT * FROM "CatalogItem" WHERE ${where.join(' AND ')} ORDER BY name LIMIT 500`, params);
  return result.rows;
}

async function upsertCatalog(companyId, item) {
  const {
    id, sku, name, category, shape, diameterMm, widthMm, heightMm, lengthMm, angleDeg,
    materialCode, unit, weightKg, attributes,
  } = item;
  if (id) {
    const result = await query(
      `UPDATE "CatalogItem" SET sku=$1,name=$2,category=$3,shape=$4,"diameterMm"=$5,"widthMm"=$6,"heightMm"=$7,"lengthMm"=$8,"angleDeg"=$9,"materialCode"=$10,unit=$11,"weightKg"=$12,attributes=$13
       WHERE id=$14 AND "companyId"=$15 RETURNING *`,
      [sku, name, category, shape, diameterMm, widthMm, heightMm, lengthMm, angleDeg, materialCode, unit || 'ks', weightKg, attributes || {}, id, companyId],
    );
    return result.rows;
  }
  const result = await query(
    `INSERT INTO "CatalogItem" ("companyId",sku,name,category,shape,"diameterMm","widthMm","heightMm","lengthMm","angleDeg","materialCode",unit,"weightKg",attributes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [companyId, sku, name, category, shape, diameterMm, widthMm, heightMm, lengthMm, angleDeg, materialCode, unit || 'ks', weightKg, attributes || {}],
  );
  return result.rows;
}

async function listSuppliers(companyId) {
  const result = await query(`SELECT * FROM "Supplier" WHERE "companyId"=$1 ORDER BY name`, [companyId]);
  return result.rows;
}
async function upsertSupplier(companyId, s) {
  if (s.id) {
    const result = await query(
      `UPDATE "Supplier" SET name=$1,ico=$2,dic=$3,email=$4,phone=$5,"apiType"=$6,"apiUrl"=$7,"apiKeyEnc"=$8,currency=$9,"paymentTermDays"=$10,"discountPct"=$11,active=$12,metadata=$13
       WHERE id=$14 AND "companyId"=$15 RETURNING *`,
      [s.name, s.ico, s.dic, s.email, s.phone, s.apiType || 'EMAIL', s.apiUrl, s.apiKeyEnc, s.currency || 'CZK',
       s.paymentTermDays ?? 14, s.discountPct ?? 0, s.active ?? true, s.metadata || {}, s.id, companyId],
    );
    return result.rows;
  }
  const result = await query(
    `INSERT INTO "Supplier" ("companyId",name,ico,dic,email,phone,"apiType","apiUrl","apiKeyEnc",currency,"paymentTermDays","discountPct",active,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [companyId, s.name, s.ico, s.dic, s.email, s.phone, s.apiType || 'EMAIL', s.apiUrl, s.apiKeyEnc,
     s.currency || 'CZK', s.paymentTermDays ?? 14, s.discountPct ?? 0, s.active ?? true, s.metadata || {}],
  );
  return result.rows;
}

async function listPrices(catalogItemId) {
  const result = await query(
    `SELECT sp.*, s.name as "supplierName", s.currency as "supplierCurrency"
     FROM "SupplierPrice" sp JOIN "Supplier" s ON s.id = sp."supplierId"
     WHERE sp."catalogItemId" = $1 ORDER BY sp.price ASC`,
    [catalogItemId],
  );
  return result.rows;
}
async function upsertPrice(p) {
  const curResult = await query(`SELECT price FROM "SupplierPrice" WHERE id=$1`, [p.id || '00000000-0000-0000-0000-000000000000']);
  const current = curResult.rows[0];
  if (p.id) {
    if (current && Number(current.price) !== Number(p.price)) {
      await query(`INSERT INTO "PriceHistory" ("supplierPriceId", price) VALUES ($1,$2)`, [p.id, current.price]);
    }
    const result = await query(
      `UPDATE "SupplierPrice" SET "supplierSku"=$1, price=$2, currency=$3, moq=$4,"leadTimeDays"=$5,"qtyAvailable"=$6,"validFrom"=$7,"validTo"=$8, priority=$9, "updatedAt"=NOW()
       WHERE id=$10 RETURNING *`,
      [p.supplierSku, p.price, p.currency || 'CZK', p.moq ?? 1, p.leadTimeDays ?? 3, p.qtyAvailable, p.validFrom, p.validTo, p.priority ?? 100, p.id],
    );
    return result.rows;
  }
  const result = await query(
    `INSERT INTO "SupplierPrice" ("supplierId","catalogItemId","supplierSku",price,currency,moq,"leadTimeDays","qtyAvailable","validFrom","validTo",priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [p.supplierId, p.catalogItemId, p.supplierSku, p.price, p.currency || 'CZK', p.moq ?? 1, p.leadTimeDays ?? 3, p.qtyAvailable, p.validFrom, p.validTo, p.priority ?? 100],
  );
  return result.rows;
}

// ---- RFQ + PO
async function createRfq(companyId, user, { projectId, lines, deadline, note }) {
  const result = await query(
    `INSERT INTO "Rfq" ("companyId","projectId","createdBy",status,deadline,note) VALUES ($1,$2,$3,'DRAFT',$4,$5) RETURNING *`,
    [companyId, projectId, user.id, deadline, note],
  );
  const rfq = result.rows[0];
  for (const l of lines || []) {
    await query(`INSERT INTO "RfqLine" ("rfqId","catalogItemId",quantity,note) VALUES ($1,$2,$3,$4)`,
      [rfq.id, l.catalogItemId, l.quantity, l.note]);
  }
  return rfq;
}
async function listRfq(companyId) {
  const result = await query(`SELECT * FROM "Rfq" WHERE "companyId"=$1 ORDER BY "createdAt" DESC LIMIT 200`, [companyId]);
  return result.rows;
}

async function compareOffers(rfqId) {
  const linesResult = await query(`SELECT rl.*, ci.name, ci.sku FROM "RfqLine" rl JOIN "CatalogItem" ci ON ci.id = rl."catalogItemId" WHERE rl."rfqId"=$1`, [rfqId]);
  const suppliersResult = await query(`SELECT DISTINCT s.* FROM "SupplierPrice" sp JOIN "Supplier" s ON s.id=sp."supplierId"
     WHERE sp."catalogItemId" IN (SELECT "catalogItemId" FROM "RfqLine" WHERE "rfqId"=$1)`, [rfqId]);
  const lines = linesResult.rows;
  const suppliers = suppliersResult.rows;

  const table = [];
  for (const s of suppliers) {
    const row = { supplierId: s.id, supplierName: s.name, currency: s.currency, total: 0, leadTimeDays: 0, lines: [], missing: 0 };
    for (const l of lines) {
      const priceResult = await query(`SELECT * FROM "SupplierPrice" WHERE "supplierId"=$1 AND "catalogItemId"=$2 ORDER BY priority ASC LIMIT 1`, [s.id, l.catalogItemId]);
      const p = priceResult.rows[0];
      if (!p) { row.missing += 1; row.lines.push({ sku: l.sku, name: l.name, qty: l.quantity, price: null, subtotal: null }); continue; }
      const sub = Number(p.price) * Number(l.quantity);
      row.lines.push({ sku: l.sku, name: l.name, qty: l.quantity, price: p.price, subtotal: sub, leadTimeDays: p.leadTimeDays });
      row.total += sub;
      row.leadTimeDays = Math.max(row.leadTimeDays, p.leadTimeDays || 0);
    }
    table.push(row);
  }
  table.sort((a, b) => a.total - b.total);
  return { lines, table };
}

async function createPO(companyId, user, payload) {
  const result = await query(
    `INSERT INTO "PurchaseOrder" ("companyId","projectId","supplierId","rfqQuoteId","poNumber",status,"totalAmount",currency,"createdBy","expectedAt")
     VALUES ($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8,$9) RETURNING *`,
    [companyId, payload.projectId, payload.supplierId, payload.rfqQuoteId, payload.poNumber, payload.totalAmount, payload.currency || 'CZK', user.id, payload.expectedAt],
  );
  const po = result.rows[0];
  for (const l of payload.lines || []) {
    await query(`INSERT INTO "PurchaseOrderLine" ("poId","catalogItemId","supplierSku",qty,"unitPrice",currency) VALUES ($1,$2,$3,$4,$5,$6)`,
      [po.id, l.catalogItemId, l.supplierSku, l.qty, l.unitPrice, l.currency || 'CZK']);
  }
  return po;
}
async function approvePO(companyId, user, id) {
  const result = await query(`UPDATE "PurchaseOrder" SET status='APPROVED', "approvedBy"=$1 WHERE id=$2 AND "companyId"=$3 RETURNING *`, [user.id, id, companyId]);
  return result.rows[0] || null;
}
async function receivePO(companyId, user, id, lines) {
  await query(`INSERT INTO "GoodsReceipt" ("poId","receivedBy",lines) VALUES ($1,$2,$3)`, [id, user.id, JSON.stringify(lines || [])]);
  const poResult = await query(`UPDATE "PurchaseOrder" SET status='RECEIVED' WHERE id=$1 AND "companyId"=$2 RETURNING *`, [id, companyId]);
  const po = poResult.rows[0];
  // naskladnění do InventoryMovement
  for (const l of lines || []) {
    await query(
      `INSERT INTO "InventoryMovement" ("companyId","itemId",quantity,"movementType",note,"createdBy")
       VALUES ($1,$2,$3,'IN',$4,$5)`,
      [companyId, l.catalogItemId, l.qty, `PO ${po?.poNumber || id}`, user.id],
    ).catch(() => {});
  }
  return po;
}

export const distributionService = {
  listCatalog, upsertCatalog,
  listSuppliers, upsertSupplier,
  listPrices, upsertPrice,
  createRfq, listRfq, compareOffers,
  createPO, approvePO, receivePO,
};
