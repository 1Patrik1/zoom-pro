import React, { useState } from 'react';
import {
  Printer,
  FileText,
  QrCode,
  Layers,
  CheckCircle2,
  Download,
  Settings2,
  Tag,
  Package,
  Calendar,
  Building,
  User,
  Sliders,
  Copy,
} from 'lucide-react';
import { Project, VztComponent, QrLabelSpec } from '../types';

interface PrintViewProps {
  projects: Project[];
  vztComponents: VztComponent[];
  qrLabels: QrLabelSpec[];
}

export const PrintView: React.FC<PrintViewProps> = ({
  projects,
  vztComponents,
  qrLabels,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<
    'LABELS' | 'MOUNTING_SHEET' | 'HANDOVER' | 'INSPECTION' | 'INVENTORY_TAGS'
  >('LABELS');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'ALL');
  const [labelFormat, setLabelFormat] = useState<'ZEBRA_100x60' | 'BROTHER_62' | 'A4_SHEET'>('ZEBRA_100x60');
  const [companyName, setCompanyName] = useState('ZOOM-PRO VZT s.r.o.');
  const [technicianName, setTechnicianName] = useState('Patrik Smialek');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [customNote, setCustomNote] = useState('Montáž provádět dle projektové dokumentace a ČSN EN 1507.');

  const currentProject = projects.find(p => p.id === selectedProjectId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="print-manager-view" className="space-y-6">
      {/* Non-printable Screen Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 rounded-2xl border border-cyan-500/30 text-cyan-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Tiskové sestavy & Výrobní štítkovač
                </h2>
                <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded">
                  v1.2.0 Print Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Generátor montážních soupisů, předávacích protokolů a výrobních QR/Barcode štítků pro dílnu i stavbu
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="btn-trigger-print"
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>VYTISKNOUT SESTAVU (CTRL+P)</span>
            </button>
          </div>
        </div>

        {/* Template Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6 pt-5 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedTemplate('LABELS')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTemplate === 'LABELS'
                ? 'bg-cyan-500/15 border-cyan-500 text-white font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span className="text-xs">1. Výrobní QR štítky</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Dymo, Zebra & A4 archy</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('MOUNTING_SHEET')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTemplate === 'MOUNTING_SHEET'
                ? 'bg-cyan-500/15 border-cyan-500 text-white font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-xs">2. Montážní list trasy</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Soupis prvků a výměr</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('HANDOVER')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTemplate === 'HANDOVER'
                ? 'bg-cyan-500/15 border-cyan-500 text-white font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs">3. Předávací protokol</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Podpisy a předání díla</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('INSPECTION')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTemplate === 'INSPECTION'
                ? 'bg-cyan-500/15 border-cyan-500 text-white font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-xs">4. Tlaková zkouška</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Těsnost ČSN EN 12237</div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('INVENTORY_TAGS')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTemplate === 'INVENTORY_TAGS'
                ? 'bg-cyan-500/15 border-cyan-500 text-white font-bold'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-xs">5. Paletové visačky</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Expedice a balení</div>
          </button>
        </div>

        {/* Configuration Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Přiřazená stavba / projekt:</label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="ALL">Všechny projekty (souhrnně)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code || 'PRJ'} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Formát tiskárny / média:</label>
            <select
              value={labelFormat}
              onChange={e => setLabelFormat(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="ZEBRA_100x60">Zebra / Dymo (100 × 60 mm)</option>
              <option value="BROTHER_62">Brother páska (62 mm kontinuální)</option>
              <option value="A4_SHEET">Standardní list A4 (PDF / Kancelář)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Odpovědný technik:</label>
            <input
              type="text"
              value={technicianName}
              onChange={e => setTechnicianName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Datum tisku:</label>
            <input
              type="date"
              value={printDate}
              onChange={e => setPrintDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* PRINTABLE PREVIEW CANVAS */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl min-h-[600px] print:m-0 print:p-0 print:shadow-none print:rounded-none">
        
        {/* TEMPLATE 1: LABELS */}
        {selectedTemplate === 'LABELS' && (
          <div className="space-y-6">
            <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950">
                  VÝROBNÍ A MONTÁŽNÍ ŠTÍTKY VZT TVAROVEK
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Stavba: {currentProject?.name || 'Všechny stavby'} | Kód: {currentProject?.code || 'PRJ-2026'} | Datum: {printDate}
                </p>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="font-bold bg-slate-900 text-white px-2 py-1 rounded">ČSN EN 1507</span>
              </div>
            </div>

            {/* Grid of Industrial Labels */}
            <div className={`grid ${labelFormat === 'ZEBRA_100x60' ? 'grid-cols-1 sm:grid-cols-2 gap-4' : 'grid-cols-1 sm:grid-cols-3 gap-3'}`}>
              {(vztComponents.length > 0 ? vztComponents : [
                { id: '1', type: 'Rovné', width: 500, height: 300, length: 1200, surfaceArea: 1.92, weight: 12.5, projectId: 'p1' },
                { id: '2', type: 'Koleno', width: 500, height: 300, length: 500, angle: 90, surfaceArea: 0.98, weight: 6.4, projectId: 'p1' },
                { id: '3', type: 'Přechod', width: 500, height: 300, width2: 400, height2: 200, length: 600, surfaceArea: 1.15, weight: 7.2, projectId: 'p1' },
                { id: '4', type: 'Odsazení', width: 400, height: 200, length: 800, offset: 150, surfaceArea: 1.05, weight: 6.8, projectId: 'p1' },
              ]).map((comp, idx) => (
                <div
                  key={comp.id || idx}
                  className="border-2 border-slate-900 rounded-xl p-4 flex flex-col justify-between bg-white text-slate-900 shadow-sm relative overflow-hidden page-break-inside-avoid"
                >
                  <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800 bg-cyan-100 px-1.5 py-0.5 rounded">
                        POZICE #{String(idx + 1).padStart(3, '0')}
                      </span>
                      <h3 className="font-black text-base text-slate-950 mt-1">
                        {comp.type} {comp.width}×{comp.height}
                        {comp.width2 ? ` / ${comp.width2}×${comp.height2}` : ''}
                      </h3>
                    </div>
                    <div className="w-14 h-14 bg-slate-100 border border-slate-900 rounded-lg p-1 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-slate-950" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs my-3 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Délka / Úhel:</span>
                      <span className="font-bold">{comp.length || 0} mm {comp.angle ? `(${comp.angle}°)` : ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Plocha pláště:</span>
                      <span className="font-bold">{(comp.surfaceArea || 0).toFixed(2)} m²</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Hmotnost:</span>
                      <span className="font-bold">{(comp.weight || 0).toFixed(1)} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Příruba:</span>
                      <span className="font-bold">P20 s tmelem</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-600">
                    <span>{companyName}</span>
                    <span className="font-bold font-mono">ID: {comp.id?.substring(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEMPLATE 2: MOUNTING SHEET */}
        {selectedTemplate === 'MOUNTING_SHEET' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-950">MONTÁŽNÍ LIST VZDUCHOTECHNIKY</h1>
                <p className="text-xs text-slate-600 mt-1">
                  Soupis dílů k montáži, spojovacího materiálu a kotevní techniky
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-slate-950">{companyName}</div>
                <div className="text-xs text-slate-600">Datum: {printDate}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-3 rounded-lg bg-slate-50">
              <div>
                <strong>Stavba / Zakázka:</strong> {currentProject?.name || 'Výchozí montážní trasa'}<br />
                <strong>Adresa:</strong> {currentProject?.address || 'Dle výkresové dokumentace'}
              </div>
              <div>
                <strong>Vedoucí montáže:</strong> {technicianName}<br />
                <strong>Norma provedení:</strong> ČSN EN 1507 / ČSN 73 0540
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold">
                  <th className="py-2 px-2">Poz.</th>
                  <th className="py-2 px-2">Typ prvku</th>
                  <th className="py-2 px-2">Rozměr A×B (mm)</th>
                  <th className="py-2 px-2">Délka / Úhel</th>
                  <th className="py-2 px-2">Plocha (m²)</th>
                  <th className="py-2 px-2">Hmotnost (kg)</th>
                  <th className="py-2 px-2 text-center">Stav montáže</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(vztComponents.length > 0 ? vztComponents : [
                  { id: '1', type: 'Rovné potrubí P20', width: 500, height: 300, length: 1200, surfaceArea: 1.92, weight: 12.5 },
                  { id: '2', type: 'Oblouk 90° s náběhy', width: 500, height: 300, length: 500, angle: 90, surfaceArea: 0.98, weight: 6.4 },
                  { id: '3', type: 'Osová redukce P20', width: 500, height: 300, width2: 400, height2: 200, length: 600, surfaceArea: 1.15, weight: 7.2 },
                ]).map((comp, idx) => (
                  <tr key={comp.id || idx}>
                    <td className="py-2.5 px-2 font-mono font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-2 font-bold">{comp.type}</td>
                    <td className="py-2.5 px-2 font-mono">{comp.width}×{comp.height}</td>
                    <td className="py-2.5 px-2 font-mono">{comp.length} mm {comp.angle ? `(${comp.angle}°)` : ''}</td>
                    <td className="py-2.5 px-2 font-mono">{(comp.surfaceArea || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-2 font-mono">{(comp.weight || 0).toFixed(1)}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block w-4 h-4 border border-slate-900 rounded-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 border-slate-900 pt-4 grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="font-bold mb-2">Pokyny pro montéry:</p>
                <p className="text-slate-600 leading-relaxed">{customNote}</p>
              </div>
              <div className="flex justify-between items-end pt-8">
                <div className="text-center border-t border-slate-400 w-36 pt-1">
                  Podpis montéra
                </div>
                <div className="text-center border-t border-slate-400 w-36 pt-1">
                  Převzal stavbyvedoucí
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE 3: HANDOVER PROTOCOL */}
        {selectedTemplate === 'HANDOVER' && (
          <div className="space-y-6">
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h1 className="text-2xl font-black text-slate-950">PŘEDÁVACÍ PROTOKOL DÍLA</h1>
              <p className="text-xs text-slate-600 mt-1">Protokol o odevzdání a převzetí dokončené montáže VZT a TZB rozvodů</p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs leading-relaxed">
              <div className="border border-slate-300 p-4 rounded-xl">
                <h3 className="font-bold text-slate-900 border-b pb-1 mb-2">ZHOTOVITEL</h3>
                <p><strong>{companyName}</strong></p>
                <p>IČO: 12345678 | DIČ: CZ12345678</p>
                <p>Zástupce: {technicianName}</p>
              </div>
              <div className="border border-slate-300 p-4 rounded-xl">
                <h3 className="font-bold text-slate-900 border-b pb-1 mb-2">OBJEDNATEL</h3>
                <p><strong>{currentProject?.clientName || 'Objednatel stavby s.r.o.'}</strong></p>
                <p>Stavba: {currentProject?.name || 'Hlavní výrobní hala'}</p>
                <p>Místo: {currentProject?.address || 'Praha / ČR'}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <p><strong>1. Předmět předání:</strong> Kompletní dodávka a montáž vzduchotechnického potrubí třídy těsnosti B/C včetně zaregulování a osazení koncových vyústek.</p>
              <p><strong>2. Zkoušky a certifikáty:</strong> K dílu byla doložena prohlášení o shodě, protokoly o zaregulování průtoků a protokoly o těsnosti dle ČSN EN 1507.</p>
              <p><strong>3. Vady a nedodělky:</strong> Dílo je předáno bez zjevných vad a nedodělků bránících bezpečnému provozu.</p>
            </div>

            <div className="pt-12 grid grid-cols-2 gap-12 text-xs text-center">
              <div className="border-t border-slate-900 pt-2">
                <strong>Za zhotovitele:</strong><br />
                {technicianName}<br />
                <span className="text-[10px] text-slate-500">Datum: {printDate}</span>
              </div>
              <div className="border-t border-slate-900 pt-2">
                <strong>Za objednatele:</strong><br />
                {currentProject?.clientName || 'Technický dozor investora (TDI)'}<br />
                <span className="text-[10px] text-slate-500">Datum: {printDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE 4: INSPECTION */}
        {selectedTemplate === 'INSPECTION' && (
          <div className="space-y-6 text-xs leading-relaxed">
            <div className="border-b-2 border-slate-900 pb-3 text-center">
              <h1 className="text-xl font-black text-slate-950">PROTOKOL O TLAKOVÉ ZKOUŠCE TĚSNOSTI VZT</h1>
              <p className="text-slate-600">Dle normy ČSN EN 12237 a ČSN EN 1507 (Třída těsnosti B/C)</p>
            </div>

            <table className="w-full border-collapse border border-slate-400">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold bg-slate-100 w-1/3">Měřený úsek:</td>
                  <td className="border border-slate-400 p-2">Páteřní větev V1 — Strojovna 2.NP až VZT šachta</td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold bg-slate-100">Celková plocha úseku (A):</td>
                  <td className="border border-slate-400 p-2 font-mono">48.60 m²</td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold bg-slate-100">Zkušební přetlak (ptest):</td>
                  <td className="border border-slate-400 p-2 font-mono">500 Pa</td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold bg-slate-100">Max. povolený únik (fmax):</td>
                  <td className="border border-slate-400 p-2 font-mono">0.027 · p^0.65 = 1.54 m³/(h·m²)</td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-bold bg-slate-100">Naměřený únik vzduchu:</td>
                  <td className="border border-slate-400 p-2 font-mono font-bold text-emerald-800">0.42 m³/(h·m²) — VYHOVUJE (Třída C)</td>
                </tr>
              </tbody>
            </table>

            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-medium">
              Závěr zkoušky: Potrubní rozvod splňuje požadavky na třídu těsnosti C dle ČSN EN 1507 bez nutnosti dodatečného dotmelování.
            </div>

            <div className="pt-8 flex justify-between">
              <div className="text-center border-t border-slate-400 w-44 pt-1">
                Technik měření: {technicianName}
              </div>
              <div className="text-center border-t border-slate-400 w-44 pt-1">
                Ověřil TDI stavby
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE 5: INVENTORY TAGS */}
        {selectedTemplate === 'INVENTORY_TAGS' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black border-b-2 border-slate-900 pb-2">EXPEDIČNÍ PALETOVÉ VISAČKY</h2>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(tagId => (
                <div key={tagId} className="border-4 border-slate-900 p-4 rounded-xl flex flex-col justify-between h-48 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-slate-900 text-white font-mono font-bold text-xs px-2 py-0.5 rounded">PALETA #{tagId}</span>
                      <h3 className="text-lg font-black mt-2">{currentProject?.name || 'Stavba Centrum 01'}</h3>
                      <p className="text-xs text-slate-600">Obsah: VZT Potrubí sk. 500x300</p>
                    </div>
                    <QrCode className="w-16 h-16 text-slate-900" />
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between text-xs font-mono font-bold">
                    <span>Hmotnost: ~145 kg</span>
                    <span>Balil: {technicianName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
