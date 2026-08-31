import React, { useState } from 'react';
import {
  ShieldAlert,
  Building,
  Key,
  Users,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Plus,
  ArrowUpRight,
  Clock,
  Calendar,
  ToggleLeft,
  ToggleRight,
  DollarSign,
} from 'lucide-react';
import { PlatformTenant, LicenseTier } from '../types';

interface SaasLicensingViewProps {
  tenants: PlatformTenant[];
  onUpdateTenant: (id: string, updates: Partial<PlatformTenant>) => void;
  onAddTenant: (tenant: Omit<PlatformTenant, 'id' | 'createdAt'>) => void;
}

const TIER_PRICING: Record<LicenseTier, { name: string; price: number; users: number; storage: number; color: string }> = {
  START: { name: 'START', price: 1990, users: 5, storage: 10, color: 'text-slate-400 border-slate-700 bg-slate-800/40' },
  STANDARD: { name: 'STANDARD', price: 4490, users: 15, storage: 50, color: 'text-blue-400 border-blue-500/30 bg-blue-950/20' },
  PRO: { name: 'PRO (Doporučeno)', price: 8990, users: 40, storage: 200, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' },
  ENTERPRISE: { name: 'ENTERPRISE', price: 17990, users: 999, storage: 1000, color: 'text-amber-400 border-amber-500/40 bg-amber-950/30' },
};

export const SaasLicensingView: React.FC<SaasLicensingViewProps> = ({
  tenants,
  onUpdateTenant,
  onAddTenant,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newIco, setNewIco] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState<LicenseTier>('PRO');
  const [newValidMonths, setNewValidMonths] = useState(12);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + newValidMonths);

    onAddTenant({
      name: newTenantName,
      ico: newIco,
      ownerEmail: newEmail,
      tier: newTier,
      maxUsers: TIER_PRICING[newTier].users,
      storageLimitGb: TIER_PRICING[newTier].storage,
      status: 'ACTIVE',
      validUntil: expiry.toISOString().split('T')[0],
      activeModules: [
        'dochazka',
        'projekty',
        'denik',
        'kalkulacka',
        'faktury',
        'sklad',
        'distribuce',
        'kolize',
        'aiAutoDetect',
      ],
    });

    setShowAddModal(false);
    setNewTenantName('');
    setNewIco('');
    setNewEmail('');
  };

  const totalMonthlyMrr = tenants.reduce((acc, t) => acc + (TIER_PRICING[t.tier]?.price || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              Platform Master Control
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <span>SaaS Správa Licencí & Multitenant Hub</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Globální správa zákaznických tenantů, aktivních licencí, kvót a fakturačních plánů
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>Založit nového tenanta / licenci</span>
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Celkem Tenantů</span>
            <Building className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{tenants.length}</div>
          <div className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% aktivních instancí</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Měsíční MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {totalMonthlyMrr.toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Opakující se příjmy za SaaS</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Licencovaní Uživatelé</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {tenants.reduce((acc, t) => acc + (t.maxUsers === 999 ? 50 : t.maxUsers), 0)} sedadel
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Přidělené montérské účty</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Cloud Storage</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {tenants.reduce((acc, t) => acc + t.storageLimitGb, 0)} GB
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Alokovaný prostor pro fotochat</div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(TIER_PRICING) as LicenseTier[]).map(tKey => {
          const info = TIER_PRICING[tKey];
          return (
            <div key={tKey} className={`border rounded-2xl p-5 relative ${info.color}`}>
              <div className="font-extrabold text-sm uppercase tracking-wider">{info.name}</div>
              <div className="text-xl font-black mt-2 font-mono">
                {info.price.toLocaleString('cs-CZ')} <span className="text-xs font-normal">Kč / měsíc</span>
              </div>
              <ul className="text-xs space-y-1.5 mt-3 text-slate-300">
                <li>• Až {info.users === 999 ? 'Neomezeně' : info.users} uživatelů</li>
                <li>• {info.storage} GB cloudové úložiště</li>
                <li>• 3D VZT Konfigurátor</li>
                <li>• GPS Geofencing</li>
                {tKey === 'PRO' || tKey === 'ENTERPRISE' ? <li>• AI Vision AutoDetect</li> : null}
                {tKey === 'ENTERPRISE' ? <li>• Vlastní doména & SLA 99.9%</li> : null}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Building className="w-5 h-5 text-cyan-400" />
          <span>Aktivní Klientské Společnosti (Tenanti)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Společnost & IČO</th>
                <th className="py-3 px-4">Majitel / Kontakt</th>
                <th className="py-3 px-4">Tarif</th>
                <th className="py-3 px-4">Sedadel / Storage</th>
                <th className="py-3 px-4">Platnost do</th>
                <th className="py-3 px-4">Stav</th>
                <th className="py-3 px-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-200 text-sm">{t.name}</div>
                    <div className="text-slate-500 font-mono text-[11px]">IČO: {t.ico}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="font-mono text-cyan-400">{t.ownerEmail}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={t.tier}
                      onChange={e => onUpdateTenant(t.id, { tier: e.target.value as LicenseTier })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-400 focus:outline-none"
                    >
                      <option value="START">START</option>
                      <option value="STANDARD">STANDARD</option>
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div>{t.maxUsers === 999 ? '∞' : t.maxUsers} uživatelů</div>
                    <div className="text-[11px] text-slate-500">{t.storageLimitGb} GB disk</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.validUntil}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        const newDate = new Date();
                        newDate.setFullYear(newDate.getFullYear() + 1);
                        onUpdateTenant(t.id, { validUntil: newDate.toISOString().split('T')[0] });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors"
                    >
                      +1 Rok
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Registrace Nového Firemního Tenantu</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Název společnosti</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={e => setNewTenantName(e.target.value)}
                  required
                  placeholder="Klimatizace Sever s.r.o."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">IČO</label>
                  <input
                    type="text"
                    value={newIco}
                    onChange={e => setNewIco(e.target.value)}
                    required
                    placeholder="28471923"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tarif</label>
                  <select
                    value={newTier}
                    onChange={e => setNewTier(e.target.value as LicenseTier)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="START">START (1 990 Kč)</option>
                    <option value="STANDARD">STANDARD (4 490 Kč)</option>
                    <option value="PRO">PRO (8 990 Kč)</option>
                    <option value="ENTERPRISE">ENTERPRISE (17 990 Kč)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail majitele (Superadmin tenantu)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                  placeholder="reditel@klima-sever.cz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Délka předplatného</label>
                <select
                  value={newValidMonths}
                  onChange={e => setNewValidMonths(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                >
                  <option value={1}>1 Měsíc</option>
                  <option value={3}>3 Měsíce (Kvartální)</option>
                  <option value={12}>12 Měsíců (Roční licence)</option>
                  <option value={24}>24 Měsíců (Dvouletá)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg"
                >
                  Vytvořit tenanta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
