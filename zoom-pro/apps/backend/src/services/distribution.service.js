import { query, withTransaction } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';

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
async function getPO(companyId, id) {
  const poResult = await query(
    `SELECT po.*, s.name AS "supplierName", p.name AS "projectName"
       FROM "PurchaseOrder" po
       LEFT JOIN "Supplier" s ON s.id = po."supplierId"
       LEFT JOIN "Project" p ON p.id = po."projectId"
      WHERE po.id = $1 AND po."companyId" = $2`,
    [id, companyId]
  );
  const po = poResult.rows[0];
  if (!po) throw new HttpError(404, 'PO nenalezena.');
  const linesResult = await query(
    `SELECT l.*, ci.sku, ci.name, ci.unit
       FROM "PurchaseOrderLine" l
       JOIN "CatalogItem" ci ON ci.id = l."catalogItemId"
      WHERE l."poId" = $1 ORDER BY ci.name ASC`,
    [id]
  );
  return { po, lines: linesResult.rows };
}

async function createPOFromQuote(companyId, user, rfqId, supplierId) {
  const rfqResult = await query('SELECT * FROM "Rfq" WHERE id = $1 AND "companyId" = $2', [rfqId, companyId]);
  const rfq = rfqResult.rows[0];
  if (!rfq) throw new HttpError(404, 'RFQ nenalezena.');
  if (rfq.status === 'CONVERTED') throw new HttpError(400, 'Z této poptávky už byla objednávka vytvořena.');
  const supResult = await query('SELECT * FROM "Supplier" WHERE id = $1 AND "companyId" = $2', [supplierId, companyId]);
  const supplier = supResult.rows[0];
  if (!supplier) throw new HttpError(404, 'Dodavatel nenalezen.');
  const linesResult = await query(
    `SELECT rl.*, ci.sku, ci.name, ci.unit
       FROM "RfqLine" rl JOIN "CatalogItem" ci ON ci.id = rl."catalogItemId"
      WHERE rl."rfqId" = $1`,
    [rfqId]
  );
  const lines = linesResult.rows;
  if (!lines.length) throw new HttpError(400, 'Poptávka nemá žádné položky.');

  const poLines = [];
  const missing = [];
  let total = 0;
  for (const l of lines) {
    const priceResult = await query(
      `SELECT * FROM "SupplierPrice" WHERE "supplierId" = $1 AND "catalogItemId" = $2 ORDER BY priority ASC, price ASC LIMIT 1`,
      [supplierId, l.catalogItemId]
    );
    const p = priceResult.rows[0];
    if (!p) { missing.push(l.sku); continue; }
    total += Number(p.price) * Number(l.quantity);
    poLines.push({ catalogItemId: l.catalogItemId, supplierSku: p.supplierSku, qty: Number(l.quantity), unitPrice: Number(p.price) });
  }
  if (!poLines.length) throw new HttpError(400, `Dodavatel nemá ceny pro žádnou položku (${missing.join(', ')}).`);

  const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const poResult = await query(
    `INSERT INTO "PurchaseOrder" ("companyId","projectId","supplierId","poNumber",status,"totalAmount",currency,"createdBy")
     VALUES ($1,$2,$3,$4,'DRAFT',$5,$6,$7) RETURNING *`,
    [companyId, rfq.projectId, supplierId, poNumber, total, supplier.currency || 'CZK', user.id]
  );
  const po = poResult.rows[0];
  for (const l of poLines) {
    await query(
      `INSERT INTO "PurchaseOrderLine" ("poId","catalogItemId","supplierSku",qty,"unitPrice",currency)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [po.id, l.catalogItemId, l.supplierSku, l.qty, l.unitPrice, supplier.currency || 'CZK']
    );
  }
  await query(`UPDATE "Rfq" SET status = 'CONVERTED' WHERE id = $1`, [rfqId]);
  return { po, lineCount: poLines.length, missing };
}

async function receivePO(companyId, user, id, lines) {
  return withTransaction(async (client) => {
    const poCheck = await client.query('SELECT * FROM "PurchaseOrder" WHERE id = $1 AND "companyId" = $2 FOR UPDATE', [id, companyId]);
    const existing = poCheck.rows[0];
    if (!existing) throw new HttpError(404, 'PO nenalezena.');
    if (['RECEIVED', 'CANCELLED'].includes(existing.status)) throw new HttpError(400, `PO je ve stavu ${existing.status} — příjem už není možný.`);

    const lineResult = await client.query(
      `SELECT l.*, ci.sku, ci.name, ci.unit
         FROM "PurchaseOrderLine" l
         JOIN "CatalogItem" ci ON ci.id = l."catalogItemId"
        WHERE l."poId" = $1`,
      [id]
    );
    const poLines = lineResult.rows;

    const byItem = new Map((lines || []).map((l) => [String(l.catalogItemId), Number(l.qty)]));
    let received = 0;
    let skipped = 0;
    const errors = [];
    for (const l of poLines) {
      const planned = byItem.has(String(l.catalogItemId)) ? byItem.get(String(l.catalogItemId)) : Number(l.qty);
      if (!planned || planned <= 0) { skipped += 1; continue; }
      try {
        const found = await client.query('SELECT * FROM "InventoryItem" WHERE "companyId" = $1 AND code = $2 FOR UPDATE', [companyId, l.sku]);
        let item = found.rows[0];
        if (!item) {
          const created = await client.query(
            `INSERT INTO "InventoryItem" ("companyId",name,code,quantity,unit,"minQuantity","purchasePrice",category,"isActive","createdAt","updatedAt")
             VALUES ($1,$2,$3,0,$4,0,$5,'material',TRUE,NOW(),NOW()) RETURNING *`,
            [companyId, l.name, l.sku, l.unit || 'ks', l.unitPrice]
          );
          item = created.rows[0];
        }
        const before = Number(item.quantity);
        const after = before + Math.abs(planned);
        await client.query('UPDATE "InventoryItem" SET quantity = $1, "updatedAt" = NOW() WHERE id = $2', [after, item.id]);
        await client.query(
          `INSERT INTO "InventoryMovement" ("companyId","itemId",type,quantity,"quantityBefore","quantityAfter",note,"documentRef","createdBy")
           VALUES ($1,$2,'RECEIPT',$3,$4,$5,$6,$7,$8)`,
          [companyId, item.id, Math.abs(planned), before, after, `PO ${existing.poNumber || id}`, String(existing.poNumber || id), user.id]
        );
        received += 1;
      } catch (e) {
        skipped += 1;
        errors.push(`${l.sku}: ${e.message}`);
      }
    }
    const upd = await client.query(
      `UPDATE "PurchaseOrder" SET status = 'RECEIVED' WHERE id = $1 AND "companyId" = $2 RETURNING *`,
      [id, companyId]
    );
    await client.query(
      `INSERT INTO "GoodsReceipt" ("poId","receivedBy",lines) VALUES ($1,$2,$3)`,
      [id, user.id, JSON.stringify({ received, skipped, errors })]
    );
    return { ...upd.rows[0], received, skipped, errors };
  });
}

async function listPO(companyId) {
  return query(
    `SELECT po.*, s.name AS "supplierName", p.name AS "projectName",
            (SELECT COUNT(*)::int FROM "PurchaseOrderLine" l WHERE l."poId" = po.id) AS "lineCount"
       FROM "PurchaseOrder" po
       LEFT JOIN "Supplier" s ON s.id = po."supplierId"
       LEFT JOIN "Project" p ON p.id = po."projectId"
      WHERE po."companyId" = $1
      ORDER BY po."createdAt" DESC
      LIMIT 200`,
    [companyId]
  );
}

export const distributionService = {
  listPO, getPO, createPOFromQuote,
  listCatalog, upsertCatalog,
  listSuppliers, upsertSupplier,
  listPrices, upsertPrice,
  createRfq, listRfq, compareOffers,
  createPO, approvePO, receivePO,
};
