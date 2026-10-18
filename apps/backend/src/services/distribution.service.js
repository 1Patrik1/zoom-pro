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
       WHERE id=$14 AND "companyId"=$15 RETURNING id, "companyId", name, ico, dic, email, phone, "apiType", "apiUrl", currency, "paymentTermDays", "discountPct", active, metadata, "createdAt"`,
      [sku, name, category, shape, diameterMm, widthMm, heightMm, lengthMm, angleDeg, materialCode, unit || 'ks', weightKg, attributes || {}, id, companyId],
    );
    return result.rows;
  }
  const result = await query(
    `INSERT INTO "CatalogItem" ("companyId",sku,name,category,shape,"diameterMm","widthMm","heightMm","lengthMm","angleDeg","materialCode",unit,"weightKg",attributes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id, "companyId", name, ico, dic, email, phone, "apiType", "apiUrl", currency, "paymentTermDays", "discountPct", active, metadata, "createdAt"`,
    [companyId, sku, name, category, shape, diameterMm, widthMm, heightMm, lengthMm, angleDeg, materialCode, unit || 'ks', weightKg, attributes || {}],
  );
  return result.rows;
}

async function listSuppliers(companyId) {
  const result = await query(`SELECT id, "companyId", name, ico, dic, email, phone, "apiType", "apiUrl", currency, "paymentTermDays", "discountPct", active, metadata, "createdAt" FROM "Supplier" WHERE "companyId"=$1 ORDER BY name`, [companyId]);
  return result.rows;
}
async function upsertSupplier(companyId, s) {
  if (s.id) {
    const result = await query(
      `UPDATE "Supplier" SET name=$1,ico=$2,dic=$3,email=$4,phone=$5,"apiType"=$6,"apiUrl"=$7,"apiKeyEnc"=COALESCE(NULLIF($8, ''), "apiKeyEnc"),currency=$9,"paymentTermDays"=$10,"discountPct"=$11,active=$12,metadata=$13
       WHERE id=$14 AND "companyId"=$15 RETURNING id, "companyId", name, ico, dic, email, phone, "apiType", "apiUrl", currency, "paymentTermDays", "discountPct", active, metadata, "createdAt"`,
      [s.name, s.ico, s.dic, s.email, s.phone, s.apiType || 'EMAIL', s.apiUrl, s.apiKeyEnc, s.currency || 'CZK',
       s.paymentTermDays ?? 14, s.discountPct ?? 0, s.active ?? true, s.metadata || {}, s.id, companyId],
    );
    return result.rows;
  }
  const result = await query(
    `INSERT INTO "Supplier" ("companyId",name,ico,dic,email,phone,"apiType","apiUrl","apiKeyEnc",currency,"paymentTermDays","discountPct",active,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id, "companyId", name, ico, dic, email, phone, "apiType", "apiUrl", currency, "paymentTermDays", "discountPct", active, metadata, "createdAt"`,
    [companyId, s.name, s.ico, s.dic, s.email, s.phone, s.apiType || 'EMAIL', s.apiUrl, s.apiKeyEnc,
     s.currency || 'CZK', s.paymentTermDays ?? 14, s.discountPct ?? 0, s.active ?? true, s.metadata || {}],
  );
  return result.rows;
}

async function listPrices(companyId, catalogItemId) {
  const result = await query(
    `SELECT sp.*, s.name as "supplierName", s.currency as "supplierCurrency"
     FROM "SupplierPrice" sp
     JOIN "Supplier" s ON s.id = sp."supplierId" AND s."companyId" = $2
     JOIN "CatalogItem" ci ON ci.id = sp."catalogItemId" AND ci."companyId" = $2
     WHERE sp."catalogItemId" = $1
     ORDER BY sp.price ASC`,
    [catalogItemId, companyId],
  );
  return result.rows;
}

async function upsertPrice(companyId, p) {
  if (!Number.isFinite(Number(p.price)) || Number(p.price) < 0) throw new HttpError(400, 'Cena musí být nezáporné číslo.');
  if (p.id) {
    const curResult = await query(
      `SELECT sp.price
       FROM "SupplierPrice" sp
       JOIN "Supplier" s ON s.id = sp."supplierId" AND s."companyId" = $2
       JOIN "CatalogItem" ci ON ci.id = sp."catalogItemId" AND ci."companyId" = $2
       WHERE sp.id = $1`,
      [p.id, companyId],
    );
    const current = curResult.rows[0];
    if (!current) throw new HttpError(404, 'Ceníková položka nenalezena.');
    if (Number(current.price) !== Number(p.price)) {
      await query(`INSERT INTO "PriceHistory" ("supplierPriceId", price) VALUES ($1,$2)`, [p.id, current.price]);
    }
    const result = await query(
      `UPDATE "SupplierPrice" sp
       SET "supplierSku"=$1, price=$2, currency=$3, moq=$4, "leadTimeDays"=$5,
           "qtyAvailable"=$6, "validFrom"=$7, "validTo"=$8, priority=$9, "updatedAt"=NOW()
       FROM "Supplier" s, "CatalogItem" ci
       WHERE sp.id=$10
         AND s.id=sp."supplierId" AND s."companyId"=$11
         AND ci.id=sp."catalogItemId" AND ci."companyId"=$11
       RETURNING sp.*`,
      [p.supplierSku, p.price, p.currency || 'CZK', p.moq ?? 1, p.leadTimeDays ?? 3, p.qtyAvailable, p.validFrom, p.validTo, p.priority ?? 100, p.id, companyId],
    );
    if (!result.rows.length) throw new HttpError(404, 'Ceníková položka nenalezena.');
    return result.rows;
  }

  const ownership = await query(
    `SELECT s.id AS "supplierId", ci.id AS "catalogItemId"
     FROM "Supplier" s
     JOIN "CatalogItem" ci ON ci.id = $2 AND ci."companyId" = $3
     WHERE s.id = $1 AND s."companyId" = $3`,
    [p.supplierId, p.catalogItemId, companyId],
  );
  if (!ownership.rows.length) throw new HttpError(404, 'Dodavatel nebo katalogová položka nebyli nalezeni ve vaší firmě.');

  const result = await query(
    `INSERT INTO "SupplierPrice" ("supplierId","catalogItemId","supplierSku",price,currency,moq,"leadTimeDays","qtyAvailable","validFrom","validTo",priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [p.supplierId, p.catalogItemId, p.supplierSku, p.price, p.currency || 'CZK', p.moq ?? 1, p.leadTimeDays ?? 3, p.qtyAvailable, p.validFrom, p.validTo, p.priority ?? 100],
  );
  return result.rows;
}

// ---- RFQ + PO
async function createRfq(companyId, user, { projectId, lines, deadline, note }) {
  const safeLines = Array.isArray(lines) ? lines : [];
  if (projectId) {
    const project = await query('SELECT id FROM "Project" WHERE id=$1 AND "companyId"=$2', [projectId, companyId]);
    if (!project.rows.length) throw new HttpError(404, 'Projekt nebyl nalezen ve vaší firmě.');
  }

  const itemIds = [...new Set(safeLines.map((line) => line.catalogItemId).filter(Boolean))];
  if (safeLines.some((line) => !line.catalogItemId || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) {
    throw new HttpError(400, 'Každá položka poptávky musí mít katalogovou položku a kladné množství.');
  }
  if (itemIds.length) {
    const items = await query(
      'SELECT id FROM "CatalogItem" WHERE id = ANY($1::uuid[]) AND "companyId"=$2',
      [itemIds, companyId],
    );
    if (items.rows.length !== itemIds.length) throw new HttpError(404, 'Jedna nebo více katalogových položek nebyly nalezeny ve vaší firmě.');
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO "Rfq" ("companyId","projectId","createdBy",status,deadline,note)
       VALUES ($1,$2,$3,'DRAFT',$4,$5) RETURNING *`,
      [companyId, projectId || null, user.id, deadline || null, note || null],
    );
    const rfq = result.rows[0];
    for (const line of safeLines) {
      await client.query(
        `INSERT INTO "RfqLine" ("rfqId","catalogItemId",quantity,note) VALUES ($1,$2,$3,$4)`,
        [rfq.id, line.catalogItemId, Number(line.quantity), line.note || null],
      );
    }
    return rfq;
  });
}
async function listRfq(companyId) {
  const result = await query(`SELECT * FROM "Rfq" WHERE "companyId"=$1 ORDER BY "createdAt" DESC LIMIT 200`, [companyId]);
  return result.rows;
}

async function compareOffers(companyId, rfqId) {
  const rfqResult = await query('SELECT id FROM "Rfq" WHERE id=$1 AND "companyId"=$2', [rfqId, companyId]);
  if (!rfqResult.rows.length) throw new HttpError(404, 'Poptávka nebyla nalezena ve vaší firmě.');

  const linesResult = await query(
    `SELECT rl.*, ci.name, ci.sku
     FROM "RfqLine" rl
     JOIN "CatalogItem" ci ON ci.id = rl."catalogItemId" AND ci."companyId" = $2
     WHERE rl."rfqId" = $1`,
    [rfqId, companyId],
  );
  const suppliersResult = await query(
    `SELECT DISTINCT s.id, s.name, s.currency, s."paymentTermDays", s."discountPct", s.active
     FROM "SupplierPrice" sp
     JOIN "Supplier" s ON s.id=sp."supplierId" AND s."companyId"=$2
     JOIN "CatalogItem" ci ON ci.id=sp."catalogItemId" AND ci."companyId"=$2
     WHERE sp."catalogItemId" IN (
       SELECT rl."catalogItemId"
       FROM "RfqLine" rl
       JOIN "Rfq" r ON r.id=rl."rfqId" AND r."companyId"=$2
       WHERE rl."rfqId"=$1
     )`,
    [rfqId, companyId],
  );

  const lines = linesResult.rows;
  const suppliers = suppliersResult.rows;
  const table = [];
  for (const supplier of suppliers) {
    const row = { supplierId: supplier.id, supplierName: supplier.name, currency: supplier.currency, total: 0, leadTimeDays: 0, lines: [], missing: 0 };
    for (const line of lines) {
      const priceResult = await query(
        `SELECT * FROM "SupplierPrice"
         WHERE "supplierId"=$1 AND "catalogItemId"=$2
         ORDER BY priority ASC LIMIT 1`,
        [supplier.id, line.catalogItemId],
      );
      const price = priceResult.rows[0];
      if (!price) {
        row.missing += 1;
        row.lines.push({ sku: line.sku, name: line.name, qty: line.quantity, price: null, subtotal: null });
        continue;
      }
      const subtotal = Number(price.price) * Number(line.quantity);
      row.lines.push({ sku: line.sku, name: line.name, qty: line.quantity, price: price.price, subtotal, leadTimeDays: price.leadTimeDays });
      row.total += subtotal;
      row.leadTimeDays = Math.max(row.leadTimeDays, price.leadTimeDays || 0);
    }
    table.push(row);
  }
  table.sort((left, right) => left.total - right.total);
  return { lines, table };
}

async function createPO(companyId, user, payload) {
  const safeLines = Array.isArray(payload.lines) ? payload.lines : [];
  if (!payload.supplierId) throw new HttpError(400, 'Dodavatel je povinný.');
  if (safeLines.some((line) => !line.catalogItemId || !Number.isFinite(Number(line.qty)) || Number(line.qty) <= 0
    || !Number.isFinite(Number(line.unitPrice)) || Number(line.unitPrice) < 0)) {
    throw new HttpError(400, 'Řádky objednávky musí mít platnou katalogovou položku, kladné množství a nezápornou cenu.');
  }

  return withTransaction(async (client) => {
    const supplierResult = await client.query(
      'SELECT id, currency FROM "Supplier" WHERE id=$1 AND "companyId"=$2 FOR SHARE',
      [payload.supplierId, companyId],
    );
    const supplier = supplierResult.rows[0];
    if (!supplier) throw new HttpError(404, 'Dodavatel nebyl nalezen ve vaší firmě.');

    if (payload.projectId) {
      const projectResult = await client.query(
        'SELECT id FROM "Project" WHERE id=$1 AND "companyId"=$2 FOR SHARE',
        [payload.projectId, companyId],
      );
      if (!projectResult.rows.length) throw new HttpError(404, 'Projekt nebyl nalezen ve vaší firmě.');
    }

    if (payload.rfqQuoteId) {
      const quoteResult = await client.query(
        `SELECT rq.id
         FROM "RfqQuote" rq
         JOIN "Rfq" r ON r.id=rq."rfqId" AND r."companyId"=$2
         JOIN "Supplier" s ON s.id=rq."supplierId" AND s."companyId"=$2
         WHERE rq.id=$1 AND rq."supplierId"=$3
         FOR SHARE OF rq`,
        [payload.rfqQuoteId, companyId, payload.supplierId],
      );
      if (!quoteResult.rows.length) throw new HttpError(404, 'Nabídka nebyla nalezena ve vaší firmě nebo nepatří vybranému dodavateli.');
    }

    const itemIds = [...new Set(safeLines.map((line) => line.catalogItemId))];
    if (itemIds.length) {
      const itemResult = await client.query(
        'SELECT id FROM "CatalogItem" WHERE id=ANY($1::uuid[]) AND "companyId"=$2 FOR SHARE',
        [itemIds, companyId],
      );
      if (itemResult.rows.length !== itemIds.length) throw new HttpError(404, 'Jedna nebo více katalogových položek nebyly nalezeny ve vaší firmě.');
    }

    const currency = payload.currency || supplier.currency || 'CZK';
    const totalAmount = safeLines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unitPrice), 0);
    const result = await client.query(
      `INSERT INTO "PurchaseOrder" ("companyId","projectId","supplierId","rfqQuoteId","poNumber",status,"totalAmount",currency,"createdBy","expectedAt")
       VALUES ($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8,$9) RETURNING *`,
      [companyId, payload.projectId || null, payload.supplierId, payload.rfqQuoteId || null, payload.poNumber || null, totalAmount, currency, user.id, payload.expectedAt || null],
    );
    const po = result.rows[0];
    for (const line of safeLines) {
      await client.query(
        `INSERT INTO "PurchaseOrderLine" ("poId","catalogItemId","supplierSku",qty,"unitPrice",currency)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [po.id, line.catalogItemId, line.supplierSku || null, Number(line.qty), Number(line.unitPrice), line.currency || currency],
      );
    }
    return po;
  });
}
async function approvePO(companyId, user, id) {
  const result = await query(`UPDATE "PurchaseOrder" SET status='APPROVED', "approvedBy"=$1 WHERE id=$2 AND "companyId"=$3 RETURNING *`, [user.id, id, companyId]);
  return result.rows[0] || null;
}
async function getPO(companyId, id) {
  const poResult = await query(
    `SELECT po.*, s.name AS "supplierName", p.name AS "projectName"
       FROM "PurchaseOrder" po
       LEFT JOIN "Supplier" s ON s.id = po."supplierId" AND s."companyId" = po."companyId"
       LEFT JOIN "Project" p ON p.id = po."projectId" AND p."companyId" = po."companyId"
      WHERE po.id = $1 AND po."companyId" = $2`,
    [id, companyId]
  );
  const po = poResult.rows[0];
  if (!po) throw new HttpError(404, 'PO nenalezena.');
  const linesResult = await query(
    `SELECT l.*, ci.sku, ci.name, ci.unit
       FROM "PurchaseOrderLine" l
       JOIN "CatalogItem" ci ON ci.id = l."catalogItemId" AND ci."companyId" = $2
      WHERE l."poId" = $1 ORDER BY ci.name ASC`,
    [id, companyId]
  );
  return { po, lines: linesResult.rows };
}

async function createPOFromQuote(companyId, user, rfqId, supplierId) {
  return withTransaction(async (client) => {
    const rfqResult = await client.query(
      'SELECT * FROM "Rfq" WHERE id=$1 AND "companyId"=$2 FOR UPDATE',
      [rfqId, companyId],
    );
    const rfq = rfqResult.rows[0];
    if (!rfq) throw new HttpError(404, 'RFQ nenalezena.');
    if (rfq.status === 'CONVERTED') throw new HttpError(400, 'Z této poptávky už byla objednávka vytvořena.');

    const supResult = await client.query(
      'SELECT * FROM "Supplier" WHERE id=$1 AND "companyId"=$2',
      [supplierId, companyId],
    );
    const supplier = supResult.rows[0];
    if (!supplier) throw new HttpError(404, 'Dodavatel nenalezen.');

    const linesResult = await client.query(
      `SELECT rl.*, ci.sku, ci.name, ci.unit
       FROM "RfqLine" rl
       JOIN "CatalogItem" ci ON ci.id=rl."catalogItemId" AND ci."companyId"=$2
       WHERE rl."rfqId"=$1`,
      [rfqId, companyId],
    );
    const lines = linesResult.rows;
    if (!lines.length) throw new HttpError(400, 'Poptávka nemá žádné položky.');

    const poLines = [];
    const missing = [];
    let total = 0;
    for (const line of lines) {
      const priceResult = await client.query(
        `SELECT sp.* FROM "SupplierPrice" sp
         JOIN "Supplier" s ON s.id=sp."supplierId" AND s."companyId"=$3
         JOIN "CatalogItem" ci ON ci.id=sp."catalogItemId" AND ci."companyId"=$3
         WHERE sp."supplierId"=$1 AND sp."catalogItemId"=$2
         ORDER BY priority ASC, price ASC LIMIT 1`,
        [supplierId, line.catalogItemId, companyId],
      );
      const price = priceResult.rows[0];
      if (!price) { missing.push(line.sku); continue; }
      total += Number(price.price) * Number(line.quantity);
      poLines.push({ catalogItemId: line.catalogItemId, supplierSku: price.supplierSku, qty: Number(line.quantity), unitPrice: Number(price.price) });
    }
    if (!poLines.length) throw new HttpError(400, `Dodavatel nemá ceny pro žádnou položku (${missing.join(', ')}).`);

    const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const poResult = await client.query(
      `INSERT INTO "PurchaseOrder" ("companyId","projectId","supplierId","poNumber",status,"totalAmount",currency,"createdBy")
       VALUES ($1,$2,$3,$4,'DRAFT',$5,$6,$7) RETURNING *`,
      [companyId, rfq.projectId, supplierId, poNumber, total, supplier.currency || 'CZK', user.id],
    );
    const po = poResult.rows[0];
    for (const line of poLines) {
      await client.query(
        `INSERT INTO "PurchaseOrderLine" ("poId","catalogItemId","supplierSku",qty,"unitPrice",currency)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [po.id, line.catalogItemId, line.supplierSku, line.qty, line.unitPrice, supplier.currency || 'CZK'],
      );
    }
    await client.query(
      `UPDATE "Rfq" SET status='CONVERTED' WHERE id=$1 AND "companyId"=$2`,
      [rfqId, companyId],
    );
    return { po, lineCount: poLines.length, missing };
  });
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
         JOIN "CatalogItem" ci ON ci.id = l."catalogItemId" AND ci."companyId" = $2
        WHERE l."poId" = $1`,
      [id, companyId]
    );
    const poLines = lineResult.rows;

    const requestedLines = Array.isArray(lines) ? lines : [];
    const seenIds = new Set();
    for (const line of requestedLines) {
      const itemId = String(line?.catalogItemId || '');
      const qty = Number(line?.qty);
      if (!itemId || seenIds.has(itemId) || !Number.isFinite(qty) || qty <= 0) {
        throw new HttpError(400, 'Příjem obsahuje neplatnou nebo duplicitní položku či množství.');
      }
      seenIds.add(itemId);
    }
    const orderedIds = new Set(poLines.map((line) => String(line.catalogItemId)));
    if (requestedLines.some((line) => !orderedIds.has(String(line.catalogItemId)))) {
      throw new HttpError(400, 'Příjem obsahuje položku, která není součástí této objednávky.');
    }
    const byItem = new Map(requestedLines.map((l) => [String(l.catalogItemId), Number(l.qty)]));
    for (const line of poLines) {
      if (byItem.has(String(line.catalogItemId)) && byItem.get(String(line.catalogItemId)) !== Number(line.qty)) {
        throw new HttpError(400, 'Částečný příjem není podporován. Množství musí odpovídat celé objednané položce.');
      }
    }
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
