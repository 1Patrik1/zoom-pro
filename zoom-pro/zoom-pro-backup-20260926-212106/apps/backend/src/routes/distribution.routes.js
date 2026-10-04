import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { distributionService as svc } from '../services/distribution.service.js';

const r = Router();

// Katalog
r.get('/catalog',    auth, asyncHandler(async (req, res) => res.json({ ok: true, rows: await svc.listCatalog(req.user.companyId, req.query) })));
r.post('/catalog',   auth, asyncHandler(async (req, res) => res.json({ ok: true, rows: await svc.upsertCatalog(req.user.companyId, req.body) })));

// Dodavatelé
r.get('/suppliers',  auth, asyncHandler(async (req, res) => res.json({ ok: true, rows: await svc.listSuppliers(req.user.companyId) })));
r.post('/suppliers', auth, asyncHandler(async (req, res) => res.json({ ok: true, rows: await svc.upsertSupplier(req.user.companyId, req.body) })));

// Ceníky
r.get('/prices/:catalogItemId', auth, asyncHandler(async (req, res) => res.json({ ok: true, rows: await svc.listPrices(req.params.catalogItemId) })));
r.post('/prices',    auth, asyncHandler(async (req, res) => res.json({ ok: true, rows: await svc.upsertPrice(req.body) })));

// RFQ
r.post('/rfq',       auth, asyncHandler(async (req, res) => res.json({ ok: true, rfq: await svc.createRfq(req.user.companyId, req.user, req.body) })));
r.get('/rfq',        auth, asyncHandler(async (req, res) => res.json({ ok: true, rows: await svc.listRfq(req.user.companyId) })));
r.get('/rfq/:id/compare', auth, asyncHandler(async (req, res) => res.json({ ok: true, ...(await svc.compareOffers(req.params.id)) })));

// PO
r.post('/po',        auth, asyncHandler(async (req, res) => res.json({ ok: true, po: await svc.createPO(req.user.companyId, req.user, req.body) })));
r.post('/po/:id/approve', auth, asyncHandler(async (req, res) => res.json({ ok: true, po: (await svc.approvePO(req.user.companyId, req.user, req.params.id))[0] })));
r.post('/po/:id/receive', auth, asyncHandler(async (req, res) => res.json({ ok: true, po: await svc.receivePO(req.user.companyId, req.user, req.params.id, req.body.lines || []) })));

export default r;
