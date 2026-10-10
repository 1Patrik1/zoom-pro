import { useState } from 'react';
import { Package, Truck, Tag, Send, ClipboardList, Sparkles } from 'lucide-react';
import { CatalogTab } from './CatalogTab.jsx';
import { SuppliersTab } from './SuppliersTab.jsx';
import { PricesTab } from './PricesTab.jsx';
import { RfqTab } from './RfqTab.jsx';
import { PoTab } from './PoTab.jsx';

const TABS = [
  { id: 'catalog',   label: 'Katalog',    icon: Package },
  { id: 'suppliers', label: 'Dodavatelé', icon: Truck },
  { id: 'prices',    label: 'Ceníky',     icon: Tag },
  { id: 'rfq',       label: 'Poptávky (RFQ)', icon: Send },
  { id: 'po',        label: 'Objednávky (PO)', icon: ClipboardList },
];

export function DistributionPage({ token, user, db }) {
  const [tab, setTab] = useState('catalog');
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 p-6 text-white shadow">
        <div className="flex items-center gap-3">
          <Sparkles size={22} />
          <h2 className="text-2xl font-black">Distribuce & nákup</h2>
        </div>
        <p className="mt-1 text-sm opacity-90">
          Master katalog, dodavatelé, ceníky, poptávky a objednávky. Vše propojené s AI AutoDetect a kalkulačkou.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black shadow-sm ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </nav>

      {tab === 'catalog'   && <CatalogTab   token={token} onPick={setSelectedItem} />}
      {tab === 'suppliers' && <SuppliersTab token={token} />}
      {tab === 'prices'    && <PricesTab    token={token} selectedItem={selectedItem} />}
      {tab === 'rfq'       && <RfqTab       token={token} db={db} />}
      {tab === 'po'        && <PoTab        token={token} />}
    </div>
  );
}
