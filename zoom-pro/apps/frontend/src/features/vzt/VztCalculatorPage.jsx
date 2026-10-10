import { useMemo, useState } from 'react';
import {
  MEDIUM_PRESETS,
  buildSavePayload,
  calculateComponentMetrics,
  calculateDimensionFromFlow,
  calculatePressureDrop
} from './calculations.js';
import { OffsetPiecePanel } from './OffsetPiecePanel.jsx';
import { MiniCalculatorsBundle } from './MiniCalculators.jsx';
import { RouteBuilder3D } from './RouteBuilder3D.jsx';
import { RoomLoadsPanel } from './RoomLoadsPanel.jsx';
import { PressureDropPanel } from './PressureDropPanel.jsx';

const SYSTEM_OPTIONS = [
  { value: 'VZT', medium: 'vzt', label: 'VZT / vzduchotechnika' },
  { value: 'Voda', medium: 'water', label: 'Voda' },
  { value: 'Topení', medium: 'heating', label: 'Topení' }
];

export function VztCalculatorPage({ db, onCreate }) {
  const [activeTab, setActiveTab] = useState('component');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [componentForm, setComponentForm] = useState({
    systemType: 'VZT',
    medium: 'vzt',
    shape: 'rect',
    componentKind: 'straight',
    width: 500,
    height: 300,
    width2: 500,
    height2: 300,
    diameter: 250,
    diameter2: 250,
    length: 1000,
    angle: 45,
    offset: 0,
    radiusRatio: 1.0
  });
  const [dimensionForm, setDimensionForm] = useState({
    medium: 'vzt',
    flowM3h: 2500,
    targetVelocity: 4.5,
    aspectRatio: 2
  });
  const [lossForm, setLossForm] = useState({
    medium: 'vzt',
    shape: 'round',
    width: 500,
    height: 300,
    diameter: 250,
    flowM3h: 2500,
    lengthM: 20,
    elbows90: 4,
    elbows45: 0,
    tees: 1,
    valves: 0,
    reducers: 1,
    roughness: MEDIUM_PRESETS.vzt.roughness
  });

  const componentMetrics = useMemo(() => calculateComponentMetrics(componentForm), [componentForm]);
  const dimensionMetrics = useMemo(() => calculateDimensionFromFlow(dimensionForm), [dimensionForm]);
  const lossMetrics = useMemo(() => calculatePressureDrop(lossForm), [lossForm]);

  function patchComponent(key, value) {
    setComponentForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'systemType') {
        const found = SYSTEM_OPTIONS.find((item) => item.value === value);
        if (found) next.medium = found.medium;
      }
      return next;
    });
  }

  async function handleSaveComponent() {
    setSaveMessage('');
    setSaveError('');
    try {
      await onCreate(buildSavePayload(componentForm, componentMetrics));
      setSaveMessage('Výpočet byl uložen do seznamu komponent.');
    } catch (error) {
      setSaveError(error.message || 'Uložení selhalo');
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Uložené komponenty" value={(db.components || []).length} tone="text-white" />
        <StatCard title="Doporučená rychlost" value={MEDIUM_PRESETS[componentForm.medium].recommendedVelocity} tone="text-blue-400" compact />
        <StatCard title="Aktivní systém" value={componentForm.systemType} tone="text-emerald-400" />
      </section>

      <section className="flex flex-wrap gap-3">
        <TabButton active={activeTab === 'component'} onClick={() => setActiveTab('component')}>Tvarovka + doměry</TabButton>
        <TabButton active={activeTab === 'dimension'} onClick={() => setActiveTab('dimension')}>Průtok → dimenze</TabButton>
        <TabButton active={activeTab === 'loss'} onClick={() => setActiveTab('loss')}>Tlaková ztráta trasy</TabButton>
        <TabButton active={activeTab === '3d'} onClick={() => setActiveTab('3d')}>3D konfigurátor</TabButton>
      </section>

      {activeTab === 'component' && (
        <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black text-blue-400">Rozšířená kalkulačka tvarovek</h2>
            <p className="text-sm text-slate-400">Výpočet změny osy, doměrových délek, rozvinuté délky, plochy plechu, hmotnosti a orientační spotřeby materiálu pro hranaté i kruhové potrubí.</p>

            <select value={componentForm.systemType} onChange={(e) => patchComponent('systemType', e.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              {SYSTEM_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>

            <div className="grid gap-3 md:grid-cols-2">
              <select value={componentForm.shape} onChange={(e) => patchComponent('shape', e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
                <option value="rect">Hranaté potrubí</option>
                <option value="round">Kruhové potrubí</option>
              </select>
              <select value={componentForm.componentKind} onChange={(e) => patchComponent('componentKind', e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
                <option value="straight">Rovný kus</option>
                <option value="elbow">Koleno</option>
                <option value="offset">Odsazení / změna osy</option>
                <option value="transition">Přechod / redukce</option>
              </select>
            </div>

            {componentForm.shape === 'round' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <NumberField label="Průměr d1 (mm)" value={componentForm.diameter} onChange={(value) => patchComponent('diameter', value)} />
                <NumberField label="Průměr d2 (mm)" value={componentForm.diameter2} onChange={(value) => patchComponent('diameter2', value)} />
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <NumberField label="Šířka b1 (mm)" value={componentForm.width} onChange={(value) => patchComponent('width', value)} />
                  <NumberField label="Výška h1 (mm)" value={componentForm.height} onChange={(value) => patchComponent('height', value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <NumberField label="Šířka b2 (mm)" value={componentForm.width2} onChange={(value) => patchComponent('width2', value)} />
                  <NumberField label="Výška h2 (mm)" value={componentForm.height2} onChange={(value) => patchComponent('height2', value)} />
                </div>
              </>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <NumberField label="Délka L (mm)" value={componentForm.length} onChange={(value) => patchComponent('length', value)} />
              <NumberField label="Změna osy e (mm)" value={componentForm.offset} onChange={(value) => patchComponent('offset', value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField label="Úhel (°)" value={componentForm.angle} onChange={(value) => patchComponent('angle', value)} />
              <NumberField label="Poloměr kolena ×D" value={componentForm.radiusRatio} step="0.1" onChange={(value) => patchComponent('radiusRatio', value)} />
            </div>

            {saveMessage && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{saveMessage}</div>}
            {saveError && <div className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{saveError}</div>}

            <button onClick={handleSaveComponent} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white">Uložit tvarovku do appky</button>
          </div>

          <div className="space-y-4">
            <InfoGrid metrics={componentMetrics} componentKind={componentForm.componentKind} />
            <OffsetPiecePanel />
            <MiniCalculatorsBundle />
            <PressureDropPanel />
            <RoomLoadsPanel />
            <RouteBuilder3D />
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-400">Co jsem přidal navíc</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>• orientační přístupové dvířko podle délky / úhlu / hydraulického průměru</li>
                <li>• odhad šroubů, pásky, nýtů a tmelu</li>
                <li>• výpočet vnitřního, středního a vnějšího doměru</li>
                <li>• podpora přechodu, odsazení i kolena pro hranaté i kruhové díly</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'dimension' && (
        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black text-blue-400">Výpočet průtoku na dimenzi</h2>
            <select value={dimensionForm.medium} onChange={(e) => setDimensionForm((c) => ({ ...c, medium: e.target.value }))} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              {Object.entries(MEDIUM_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
            <NumberField label="Průtok (m³/h)" value={dimensionForm.flowM3h} onChange={(value) => setDimensionForm((c) => ({ ...c, flowM3h: value }))} />
            <NumberField label="Cílová rychlost (m/s)" value={dimensionForm.targetVelocity} step="0.1" onChange={(value) => setDimensionForm((c) => ({ ...c, targetVelocity: value }))} />
            <NumberField label="Poměr stran hranatého potrubí b/h" value={dimensionForm.aspectRatio} step="0.1" onChange={(value) => setDimensionForm((c) => ({ ...c, aspectRatio: value }))} />
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black text-emerald-400">Doporučené dimenze</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Potřebná plocha" value={`${dimensionMetrics.areaRequiredM2} m²`} />
              <MetricCard label="Kruhová dimenze" value={`Ø ${dimensionMetrics.roundDiameterMm} mm`} />
              <MetricCard label="Hranatá dimenze" value={`${dimensionMetrics.rectWidthMm} × ${dimensionMetrics.rectHeightMm} mm`} />
              <MetricCard label="Ekvivalent Ø" value={`Ø ${dimensionMetrics.equivalentRoundMm} mm`} />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p><span className="font-bold text-white">Doporučené rychlosti pro médium:</span> {MEDIUM_PRESETS[dimensionForm.medium].recommendedVelocity}</p>
              <p className="mt-2 text-slate-400">Výpočet používá průtok v m³/h a převádí ho na minimální průřez při zadané cílové rychlosti. Hranatý rozměr zaokrouhluji na 50 mm krok, aby byl použitelný v praxi.</p>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'loss' && (
        <section className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black text-blue-400">Tlaková ztráta na délku trasy</h2>
            <select value={lossForm.medium} onChange={(e) => setLossForm((c) => ({ ...c, medium: e.target.value, roughness: MEDIUM_PRESETS[e.target.value].roughness }))} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              {Object.entries(MEDIUM_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
            <select value={lossForm.shape} onChange={(e) => setLossForm((c) => ({ ...c, shape: e.target.value }))} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
              <option value="round">Kruhové</option>
              <option value="rect">Hranaté</option>
            </select>
            {lossForm.shape === 'round' ? (
              <NumberField label="Průměr (mm)" value={lossForm.diameter} onChange={(value) => setLossForm((c) => ({ ...c, diameter: value }))} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <NumberField label="Šířka (mm)" value={lossForm.width} onChange={(value) => setLossForm((c) => ({ ...c, width: value }))} />
                <NumberField label="Výška (mm)" value={lossForm.height} onChange={(value) => setLossForm((c) => ({ ...c, height: value }))} />
              </div>
            )}
            <NumberField label="Průtok (m³/h)" value={lossForm.flowM3h} onChange={(value) => setLossForm((c) => ({ ...c, flowM3h: value }))} />
            <NumberField label="Délka trasy (m)" value={lossForm.lengthM} step="0.1" onChange={(value) => setLossForm((c) => ({ ...c, lengthM: value }))} />
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField label="Kolena 90°" value={lossForm.elbows90} onChange={(value) => setLossForm((c) => ({ ...c, elbows90: value }))} />
              <NumberField label="Kolena 45°" value={lossForm.elbows45} onChange={(value) => setLossForm((c) => ({ ...c, elbows45: value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField label="T-kusy" value={lossForm.tees} onChange={(value) => setLossForm((c) => ({ ...c, tees: value }))} />
              <NumberField label="Ventily" value={lossForm.valves} onChange={(value) => setLossForm((c) => ({ ...c, valves: value }))} />
              <NumberField label="Redukce" value={lossForm.reducers} onChange={(value) => setLossForm((c) => ({ ...c, reducers: value }))} />
            </div>
            <NumberField label="Drsnost (m)" value={lossForm.roughness} step="0.00001" onChange={(value) => setLossForm((c) => ({ ...c, roughness: value }))} />
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-black text-emerald-400">Výsledek tlakové ztráty</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Rychlost" value={`${lossMetrics.velocityMS} m/s`} />
              <MetricCard label="Hydraulický průměr" value={`${lossMetrics.hydraulicDiameterM} m`} />
              <MetricCard label="Reynolds" value={lossMetrics.reynolds} />
              <MetricCard label="Třecí faktor" value={lossMetrics.frictionFactor} />
              <MetricCard label="Ztráta na délce" value={`${lossMetrics.straightLossPa} Pa`} />
              <MetricCard label="Ztráta na armaturách" value={`${lossMetrics.fittingLossPa} Pa`} />
              <MetricCard label="Celkem" value={`${lossMetrics.totalLossPa} Pa`} highlight />
              <MetricCard label="Na metr" value={`${lossMetrics.totalLossPerMeterPa} Pa/m`} />
              <MetricCard label="Σζ" value={lossMetrics.zetaTotal} />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p><span className="font-bold text-white">Doporučené rychlosti:</span> {lossMetrics.recommendedVelocity}</p>
              <p className="mt-2"><span className="font-bold text-white">Doporučení:</span> {lossMetrics.recommendation}</p>
              <p className="mt-2 text-slate-400">Výpočet používá Darcy–Weisbach a zjednodušené součinitele místních ztrát pro kolena, T-kusy, ventily a redukce. Je to rychlý projekční odhad pro návrh dimenze a délky trasy.</p>
            </div>
          </div>
        </section>
      )}

      {activeTab === '3d' && (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <h2 className="text-lg font-black text-blue-400">3D VZT konfigurátor</h2>
            <p className="mt-1 text-sm text-slate-400">Do appky jsem vložil i nahraný 3D modul pro rychlé prostorové ověření přechodů, offsetů a rozměrů. Běží přímo uvnitř systému jako samostatný konfigurátor.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-3">
            <iframe
              title="3D VZT konfigurátor"
              src="/configurator-3d.html"
              className="h-[780px] w-full rounded-2xl border border-slate-800 bg-white"
            />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            <p><span className="font-bold text-white">Tip:</span> 3D konfigurátor je vhodný hlavně pro rychlé vizuální posouzení redukcí a změn osy. Výpočtová část nahoře zůstává přesnější pro doměry, tlakovou ztrátu a výkaz materiálu.</p>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-black text-blue-400">Uložené komponenty z kalkulačky</h3>
        <div className="mt-4 space-y-3">
          {(db.components || []).map((component) => (
            <div key={component.id} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-blue-400">{component.type}</p>
                  <p className="text-xs text-slate-500">ID: {component.id}</p>
                  {component.note && <p className="mt-2 text-xs text-slate-400">{component.note}</p>}
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-400">{component.surfaceArea} m²</p>
                  <p className="text-xs text-slate-500">Hmotnost: {component.weight ?? '-'} kg • Osa: {component.offset ?? 0} mm</p>
                </div>
              </div>
            </div>
          ))}
          {!db.components?.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-500">Zatím nejsou uložené žádné kalkulované komponenty.</div>}
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange, step = '1' }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} type="number" step={step} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
    </label>
  );
}

function MetricCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-emerald-700 bg-emerald-950/20' : 'border-slate-800 bg-slate-950'}`}>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-3 text-lg font-black ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function StatCard({ title, value, tone, compact = false }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
      <p className={`mt-3 ${compact ? 'text-sm' : 'text-2xl'} font-black ${tone}`}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return <button onClick={onClick} className={`rounded-2xl px-4 py-3 text-sm font-black uppercase ${active ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}>{children}</button>;
}

function InfoGrid({ metrics, componentKind }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Průřez start" value={`${metrics.areaStartM2} m²`} />
      <MetricCard label="Průřez konec" value={`${metrics.areaEndM2} m²`} />
      <MetricCard label="Hydraulický průměr" value={`${metrics.hydraulicDiameterM} m`} />
      <MetricCard label="Změna osy" value={`${metrics.offset} mm`} />
      <MetricCard label="Střední délka" value={`${metrics.centerLengthM} m`} />
      <MetricCard label="Rozvinutá délka" value={`${metrics.slantLengthM} m`} />
      <MetricCard label="Vnitřní doměr" value={`${metrics.innerDevelopedM} m`} />
      <MetricCard label="Vnější doměr" value={`${metrics.outerDevelopedM} m`} />
      <MetricCard label="Plocha plechu" value={`${metrics.surfaceAreaM2} m²`} highlight />
      <MetricCard label="Hmotnost" value={`${metrics.weightKg} kg`} />
      <MetricCard label="Šrouby / nýty" value={`${metrics.estimatedScrews} / ${metrics.estimatedRivets}`} />
      <MetricCard label="Páska / tmel" value={`${metrics.estimatedTapeM} m / ${metrics.estimatedSealantKg} kg`} />
      {componentKind === 'elbow' && <MetricCard label="Poloměr střednice" value={`${metrics.centerRadiusM} m`} />}
      <MetricCard label="Dvířka" value={metrics.requiresAccessDoor ? 'Ano' : 'Ne'} />
    </div>
  );
}
