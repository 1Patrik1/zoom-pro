import { query } from '../config/db.js';

export const materialsRepo = {
  async search(companyId, q) {
    const text = `SELECT * FROM "Material" WHERE "companyId" = $1 AND (name ILIKE $2 OR code ILIKE $2) ORDER BY name LIMIT 50`;
    return query(text, [companyId, `%${q}%`]);
  },

  async list(companyId) {
    const text = `SELECT * FROM "Material" WHERE "companyId" = $1 ORDER BY name LIMIT 500`;
    return query(text, [companyId]);
  },

  async create(companyId, payload) {
    const text = `INSERT INTO "Material" ("companyId","code","name","unit","price","category") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    return query(text, [companyId, payload.code, payload.name, payload.unit, payload.price, payload.category]);
  },

  async seed(rows = []) {
    const results = [];
    for (const r of rows) {
      const res = await query(
        `INSERT INTO "Material" ("companyId","code","name","unit","price","category") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [r.companyId || null, r.code, r.name, r.unit || 'ks', r.price || 0, r.category || 'Materiál']
      );
      results.push(res.rows[0]);
    }
    return results;
  }
};
