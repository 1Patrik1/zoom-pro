import { licensingRepo } from '../repositories/licensing.repo.js';
import { HttpError } from '../utils/http-error.js';

function calcPrice(plan, { users, modules, period }) {
  const included = new Set(plan.includedModules || []);
  const base = Number(plan.basePricePerUserMonth || 0) * Math.max(1, users);
  const flat = Number(plan.flatPricePerMonth || 0);
  let addons = 0;
  const addonTable = plan.moduleAddons || {};
  for (const m of modules) {
    if (included.has(m)) continue;
    if (addonTable[m] != null) addons += Number(addonTable[m]);
  }
  const monthly = base + flat + addons;
  const discounts = plan.periodDiscounts || { 1: 0, 3: 0.05, 6: 0.10, 12: 0.20 };
  const dRate = Number(discounts[String(period)] ?? 0);
  const monthlyDiscounted = monthly * (1 - dRate);
  const total = monthlyDiscounted * Math.max(1, period);
  return {
    base, flat, addons,
    monthly: Math.round(monthly * 100) / 100,
    monthlyDiscounted: Math.round(monthlyDiscounted * 100) / 100,
    total: Math.round(total * 100) / 100,
    discountRate: dRate,
  };
}

export const licensingService = {
  async listPlans(user) {
    const plans = await licensingRepo.listPlans();
    if (user?.role === 'SUPERADMIN') return plans;
    return plans.filter((p) => p.isPublic);
  },

  async savePlan(user, payload) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Pouze SUPERADMIN může upravovat tarify.');
    if (!payload?.code || !payload?.name) throw new HttpError(400, 'Vyplň code a name.');
    const rows = await licensingRepo.upsertPlan(payload);
    return rows[0];
  },

  async deletePlan(user, code) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Pouze SUPERADMIN.');
    await licensingRepo.deletePlan(code);
    return { ok: true };
  },

  async getMyLicense(user) {
    const [license] = await licensingRepo.getTenantLicense(user.companyId);
    const [{ count } = { count: 0 }] = await licensingRepo.countActiveUsers(user.companyId);
    return { license: license || null, activeUsers: count };
  },

  async quote(user, { planCode, users, modules, period }) {
    const [plan] = await licensingRepo.getPlanByCode(planCode);
    if (!plan) throw new HttpError(404, `Tarif ${planCode} neexistuje.`);
    const pricing = calcPrice(plan, { users, modules: modules || [], period });
    return { plan, pricing };
  },

  async subscribe(user, { planCode, users, modules, period }) {
    if (!['REDITEL', 'SUPERADMIN'].includes(user.role)) {
      throw new HttpError(403, 'Změnit licenci může jen ředitel firmy.');
    }
    const [plan] = await licensingRepo.getPlanByCode(planCode);
    if (!plan) throw new HttpError(404, 'Tarif nenalezen.');
    const pricing = calcPrice(plan, { users, modules, period });
    const validFrom = new Date();
    const validTo = new Date(validFrom);
    validTo.setMonth(validTo.getMonth() + Math.max(1, period));

    const merged = Array.from(new Set([...(plan.includedModules || []), ...(modules || [])]));

    const [row] = await licensingRepo.saveTenantLicense({
      companyId: user.companyId,
      planCode,
      maxUsers: users,
      enabledModules: merged,
      billingPeriod: period,
      priceMonthly: pricing.monthlyDiscounted,
      priceTotal: pricing.total,
      currency: 'CZK',
      validFrom,
      validTo,
      status: 'active',
    });
    return { license: row, pricing, plan };
  },

  async getPublicBranding() {
    const rows = await licensingRepo.listPlatformSettings();
    const b = rows.rows.find((x) => x.key === 'branding');
    return { name: 'Zoom Pro', primaryColor: '#2563eb', logoUrl: '', ...(b?.value || {}) };
  },

  async listPlatformSettings(user) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Pouze SUPERADMIN.');
    return licensingRepo.listPlatformSettings();
  },
  async savePlatformSetting(user, { key, value }) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Pouze SUPERADMIN.');
    if (!key) throw new HttpError(400, 'key je povinný.');
    const rows = await licensingRepo.setPlatformSetting(key, value);
    return rows[0];
  },
};
