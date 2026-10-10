import React, { useState } from 'react';
import {
  Settings,
  Building,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Shield,
  MapPin,
  FileCode,
  Sliders,
  Database,
  KeyRound,
  FileText,
} from 'lucide-react';
import { CompanySettings } from '../types';

interface SettingsViewProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [activeSection, setActiveSection] = useState<
    'firma' | 'kalkulator' | 'geofence' | 'bezpecnost' | 'cislovani' | 'moduly'
  >('firma');

  const [formData, setFormData] = useState<CompanySettings>({
    ...settings,
    sheetMetalDensity: settings.sheetMetalDensity ?? 7.85,
    weightCoefficient: settings.weightCoefficient ?? 0.9,
    surfaceAreaReserveFactor: settings.surfaceAreaReserveFactor ?? 1.15,
    accessDoorStraightThresholdM: settings.accessDoorStraightThresholdM ?? 4,
    accessDoorElbowThresholdDeg: settings.accessDoorElbowThresholdDeg ?? 45,
    geofenceRadiusMeters: settings.geofenceRadiusMeters ?? 150,
    requireGps: settings.requireGps ?? true,
    allowManualEdit: settings.allowManualEdit ?? false,
    allowBackfill: settings.allowBackfill ?? true,
    autoBreakMinutes: settings.autoBreakMinutes ?? 30,
    roundingMinutes: settings.roundingMinutes ?? 5,
    jwtExpiresInMinutes: settings.jwtExpiresInMinutes ?? 480,
    twoFactorRequired: settings.twoFactorRequired ?? false,
    require2faForSignatures: settings.require2faForSignatures ?? true,
    passwordMinLength: settings.passwordMinLength ?? 10,
    requireUppercase: settings.requireUppercase ?? true,
    requireNumbers: settings.requireNumbers ?? true,
    invoicePrefix: settings.invoicePrefix ?? 'FA',
    dailyLogPrefix: settings.dailyLogPrefix ?? 'DEN',
    attendanceExportPrefix: settings.attendanceExportPrefix ?? 'DOC',
    handoverPrefix: settings.handoverPrefix ?? 'PP',
    defaultVatRate: settings.defaultVatRate ?? 21,
    marginPercent: settings.marginPercent ?? 45,
    modulesEnabled: {
      vztConfigurator: true,
      gpsAttendance: true,
      dailyLog: true,
      invoicing: true,
      warehouse: true,
      signatures: true,
      distribution: true,
      collisions: true,
      monterInvoices: true,
      aiAutoDetect: true,
      saasLicensing: true,
      reports: true,
      ...(settings.modulesEnabled || {}),
    },
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const toggleModule = (moduleKey: keyof CompanySettings['modulesEnabled']) => {
    setFormData(prev => ({
      ...prev,
      modulesEnabled: {
        ...prev.modulesEnabled,
        [moduleKey]: !prev.modulesEnabled[moduleKey],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              System Settings & Schemas
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1">
            <Settings className="w-6 h-6 text-cyan-400" />
            <span>Master Konfigurace Platformy & Schémat</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Podrobné nastavení firemních údajů, parametrů VZT výpočtů, geofencingu docházky, bezpečnostních politik a modulů
          </p>
        </div>

        {isSaved && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-1.5 animate-fade-in shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-4 h-4" />
            <span>Všechny parametry byly úspěšně uloženy!</span>
          </div>
        )}
      </div>

      {/* 6 Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'firma', label: '1. Firma & Fakturace', icon: Building },
          { id: 'kalkulator', label: '2. Kalkulační Jádro VZT', icon: Layers },
          { id: 'geofence', label: '3. GPS Geofence & Docházka', icon: MapPin },
          { id: 'bezpecnost', label: '4. Bezpečnost & 2FA', icon: Shield },
          { id: 'cislovani', label: '5. Číslování Dokladů', icon: FileText },
          { id: 'moduly', label: '6. Aktivace Modulů', icon: Sliders },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: FIRMA */}
        {activeSection === 'firma' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Building className="w-5 h-5 text-cyan-400" />
              <span>Identifikace Společnosti & Platební Údaje SPAYD</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Obchodní název</label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">IČO</label>
                <input
                  type="text"
                  value={formData.ico || ''}
                  onChange={e => setFormData({ ...formData, ico: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">DIČ</label>
                <input
                  type="text"
                  value={formData.dic || ''}
                  onChange={e => setFormData({ ...formData, dic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bankovní účet (tvar: 123456/0100)</label>
                <input
                  type="text"
                  value={formData.bankAccount || ''}
                  onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">IBAN (pro mezinárodní a SPAYD platby)</label>
                <input
                  type="text"
                  value={formData.bankIban || ''}
                  onChange={e => setFormData({ ...formData, bankIban: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">SWIFT / BIC</label>
                <input
                  type="text"
                  value={formData.bankSwift || ''}
                  onChange={e => setFormData({ ...formData, bankSwift: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KALKULAČNÍ JÁDRO */}
        {activeSection === 'kalkulator' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Kalkulační Vzorce, Fyzikální Konstanty & Pravidla VZT</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hustota ocelového plechu (kg/dm³)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sheetMetalDensity}
                  onChange={e => setFormData({ ...formData, sheetMetalDensity: parseFloat(e.target.value) || 7.85 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Koeficient hmotnosti (Weight Coeff)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weightCoefficient}
                  onChange={e => setFormData({ ...formData, weightCoefficient: parseFloat(e.target.value) || 0.9 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rezerva plochy (Reserve Factor)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.surfaceAreaReserveFactor}
                  onChange={e => setFormData({ ...formData, surfaceAreaReserveFactor: parseFloat(e.target.value) || 1.15 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nákupní cena za m² plechu (Kč)</label>
                <input
                  type="number"
                  value={formData.costPerSqMeter}
                  onChange={e => setFormData({ ...formData, costPerSqMeter: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prodejní cena za m² plechu (Kč)</label>
                <input
                  type="number"
                  value={formData.sellPerSqMeter}
                  onChange={e => setFormData({ ...formData, sellPerSqMeter: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 mt-2">
              <div className="text-xs font-bold text-amber-400">Pravidla automatického vkládání revizních dvířek:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                <div>• Práh délky rovného potrubí: <span className="font-mono font-bold text-white">{formData.accessDoorStraightThresholdM} m</span></div>
                <div>• Práh úhlu kolena pro revizi: <span className="font-mono font-bold text-white">&gt; {formData.accessDoorElbowThresholdDeg}°</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GPS GEOFENCE */}
        {activeSection === 'geofence' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span>GPS Geofencing & Pravidla Docházky Montérů</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Výchozí perimetr stavby (radius v metrech)</label>
                <input
                  type="number"
                  value={formData.geofenceRadiusMeters}
                  onChange={e => setFormData({ ...formData, geofenceRadiusMeters: parseInt(e.target.value) || 150 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Automatická přestávka (minut)</label>
                <input
                  type="number"
                  value={formData.autoBreakMinutes}
                  onChange={e => setFormData({ ...formData, autoBreakMinutes: parseInt(e.target.value) || 30 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">Vyžadovat GPS při příchodu</span>
                <input
                  type="checkbox"
                  checked={formData.requireGps}
                  onChange={e => setFormData({ ...formData, requireGps: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">Povolit zpětné doplnění docházky</span>
                <input
                  type="checkbox"
                  checked={formData.allowBackfill}
                  onChange={e => setFormData({ ...formData, allowBackfill: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">Zaokrouhlovat docházku na 5 min</span>
                <input
                  type="checkbox"
                  checked={formData.roundingMinutes === 5}
                  onChange={e => setFormData({ ...formData, roundingMinutes: e.target.checked ? 5 : 0 })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BEZPEČNOST */}
        {activeSection === 'bezpecnost' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-rose-400" />
              <span>Bezpečnostní Politiky, JWT & 2FA</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Platnost JWT Tokenu (minut)</label>
                <input
                  type="number"
                  value={formData.jwtExpiresInMinutes}
                  onChange={e => setFormData({ ...formData, jwtExpiresInMinutes: parseInt(e.target.value) || 480 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Minimální délka hesla (znaků)</label>
                <input
                  type="number"
                  value={formData.passwordMinLength}
                  onChange={e => setFormData({ ...formData, passwordMinLength: parseInt(e.target.value) || 10 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">Vyžadovat 2FA pro elektronické podpisy</span>
                <input
                  type="checkbox"
                  checked={formData.require2faForSignatures}
                  onChange={e => setFormData({ ...formData, require2faForSignatures: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">Auditovat citlivé akce (Audit Trail)</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ČÍSLOVÁNÍ DOKLADŮ */}
        {activeSection === 'cislovani' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>Masky a Šablony Číselných Řad</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prefix faktur (vzor: FA-2026-0001)</label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prefix stavebního deníku</label>
                <input
                  type="text"
                  value={formData.dailyLogPrefix}
                  onChange={e => setFormData({ ...formData, dailyLogPrefix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prefix předávacích protokolů</label>
                <input
                  type="text"
                  value={formData.handoverPrefix}
                  onChange={e => setFormData({ ...formData, handoverPrefix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prefix exportu docházky</label>
                <input
                  type="text"
                  value={formData.attendanceExportPrefix}
                  onChange={e => setFormData({ ...formData, attendanceExportPrefix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MODULY */}
        {activeSection === 'moduly' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              <span>Globální Matice Aktivních Modulů Zoom Pro</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'vztConfigurator', label: '3D VZT Konfigurátor & Plechy' },
                { key: 'gpsAttendance', label: 'GPS Docházka s Geofencem' },
                { key: 'dailyLog', label: 'Elektronický Stavební Deník' },
                { key: 'invoicing', label: 'Fakturace & SPAYD QR Platby' },
                { key: 'warehouse', label: 'Sklad & Materiálové Hospodářství' },
                { key: 'signatures', label: 'Digitální e-Podpisy (SHA-256)' },
                { key: 'distribution', label: 'B2B Nákup & Distribuce' },
                { key: 'collisions', label: 'Stavební Kolize & QR Štítky' },
                { key: 'monterInvoices', label: 'Výkazy & Faktury Montérů' },
                { key: 'aiAutoDetect', label: 'Gemini Vision AI AutoDetect' },
                { key: 'saasLicensing', label: 'SaaS Licencování & Multitenant' },
                { key: 'reports', label: 'Finanční Reporty & Ziskovost' },
              ].map(item => {
                const isEnabled = !!formData.modulesEnabled[item.key as keyof CompanySettings['modulesEnabled']];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleModule(item.key as keyof CompanySettings['modulesEnabled'])}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isEnabled
                        ? 'bg-slate-950 border-cyan-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="text-xs font-semibold">{item.label}</span>
                    {isEnabled ? (
                      <ToggleRight className="w-6 h-6 text-cyan-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-xl shadow-cyan-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>Uložit Veškerá Nastavení</span>
          </button>
        </div>
      </form>
    </div>
  );
};
