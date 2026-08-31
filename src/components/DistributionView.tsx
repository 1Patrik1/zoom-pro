import React, { useState } from 'react';
import {
  ShoppingBag,
  Package,
  Truck,
  FileSpreadsheet,
  FileCheck,
  Send,
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
  Tag,
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CatalogItem, Supplier, PurchaseRequest, PurchaseOrder } from '../types';

interface DistributionViewProps {
  catalog: CatalogItem[];
  suppliers: Supplier[];
  rfqs: PurchaseRequest[];
  orders: PurchaseOrder[];
  onAddCatalogItem: (item: Omit<CatalogItem, 'id'>) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onAddRfq: (rfq: Omit<PurchaseRequest, 'id' | 'createdAt'>) => void;
  onAddOrder: (order: Omit<PurchaseOrder, 'id' | 'createdAt'>) => void;
  onUpdateOrderStatus: (id: string, status: PurchaseOrder['status']) => void;
}

export const DistributionView: React.FC<DistributionViewProps> = ({
  catalog,
  suppliers,
  rfqs,
  orders,
  onAddCatalogItem,
  onAddSupplier,
  onAddRfq,
  onAddOrder,
  onUpdateOrderStatus,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'katalog' | 'dodavatele' | 'ceniky' | 'poptavky' | 'objednavky'>('katalog');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [showAddSkuModal, setShowAddSkuModal] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<CatalogItem['category']>('SPIRO');
  const [newStdPrice, setNewStdPrice] = useState(650);
  const [newWsPrice, setNewWsPrice] = useState(420);
  const [newStock, setNewStock] = useState(30);

  const handleCreateSku = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCatalogItem({
      sku: newSku,
      name: newName,
      category: newCat,
      manufacturer: 'Lindab / Systemair CZ',
      unit: newCat === 'SPIRO' ? 'bm' : 'ks',
      standardPrice: newStdPrice,
      wholesalePrice: newWsPrice,
      inStock: newStock,
      leadTimeDays: 2,
    });
    setShowAddSkuModal(false);
    setNewSku('');
    setNewName('');
  };

  const filteredCatalog = catalog.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchFilter.toLowerCase()) || item.sku.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              B2B Marketplace & Sourcing
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1">
            <ShoppingBag className="w-6 h-6 text-blue-400" />
            <span>Distribuce & Nákupní Centrum VZT</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Kompletní B2B nákupní proces: Katalog komponentů, správa dodavatelů, RFQ poptávky a objednávky (PO)
          </p>
        </div>

        <button
          onClick={() => setShowAddSkuModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 text-white text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Přidat položku do katalogu (SKU)</span>
        </button>
      </div>

      {/* 5 Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'katalog', label: '1. Katalog SKU & Ceny', icon: Package, count: catalog.length },
          { id: 'dodavatele', label: '2. Dodavatelé & Kontakty', icon: Truck, count: suppliers.length },
          { id: 'ceniky', label: '3. Rabaty & Ceníkové matice', icon: FileSpreadsheet, count: 4 },
          { id: 'poptavky', label: '4. Poptávky (RFQ)', icon: Send, count: rfqs.length },
          { id: 'objednavky', label: '5. Nákupní Objednávky (PO)', icon: FileCheck, count: orders.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: KATALOG */}
      {activeSubTab === 'katalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Hledat dle SKU nebo názvu tvarovky..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none"
            >
              <option value="ALL">Všechny kategorie</option>
              <option value="SPIRO">Spiro potrubí</option>
              <option value="CTYRHATNE">Čtyřhranné potrubí</option>
              <option value="TLUMICE">Tlumiče hluku</option>
              <option value="KLAPKY">Požární & Regulační klapky</option>
              <option value="VENTILY">Talířové ventily</option>
              <option value="SPOJOVACI">Spojovací materiál M8</option>
              <option value="CHEMIE">Tmely & Těsnění</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map(item => {
              const margin = item.standardPrice - item.wholesalePrice;
              const marginPct = Math.round((margin / item.wholesalePrice) * 100);

              return (
                <div key={item.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] bg-blue-950 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded font-bold">
                        {item.sku}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Skladem: {item.inStock} {item.unit}</span>
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-100 mt-2">{item.name}</h4>
                    <p className="text-slate-400 text-xs mt-0.5">Výrobce: {item.manufacturer}</p>
                  </div>

                  <div className="border-t border-slate-800/80 pt-3 mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Nákup velkoobchod</div>
                        <div className="font-mono font-bold text-slate-300">{item.wholesalePrice} Kč / {item.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase">Doporučený prodej</div>
                        <div className="font-mono font-bold text-cyan-400">{item.standardPrice} Kč / {item.unit}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-emerald-400 flex items-center justify-between bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-800/30">
                      <span>Marže: +{margin} Kč / {item.unit}</span>
                      <span className="font-bold">+{marginPct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DODAVATELE */}
      {activeSubTab === 'dodavatele' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Dodavatel</th>
                  <th className="py-3 px-4">Kontaktní osoba</th>
                  <th className="py-3 px-4">E-mail & Telefon</th>
                  <th className="py-3 px-4">Rabatová sleva</th>
                  <th className="py-3 px-4">Splatnost</th>
                  <th className="py-3 px-4">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200 text-sm">{sup.name}</div>
                      <div className="text-slate-500 text-[11px] font-mono">IČO: {sup.ico} {sup.dic && `| DIČ: ${sup.dic}`}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">{sup.contactPerson}</td>
                    <td className="py-3 px-4 text-slate-400">
                      <div>{sup.email}</div>
                      <div className="font-mono text-[11px] text-slate-500">{sup.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      -{sup.discountPercent}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{sup.paymentTermsDays} dní</td>
                    <td className="py-3 px-4 text-amber-400 font-bold">
                      {'★'.repeat(sup.rating)}{'☆'.repeat(5 - sup.rating)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CENIKY & MATICE */}
      {activeSubTab === 'ceniky' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Slevové hladiny (Rabatové skupiny B2B)</span>
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { group: 'Rabat A: Spiro potrubí & tvarovky lisované', discount: '38%', supplier: 'Lindab / Systemair' },
                { group: 'Rabat B: Čtyřhranné potrubí tl. 0.8-1.0mm', discount: '42%', supplier: 'Vlastní VZT výroba' },
                { group: 'Rabat C: Požární klapky a servopohony Belimo', discount: '25%', supplier: 'Trox / Mandík' },
                { group: 'Rabat D: VZT chemie, kaučukové izolace a pásky', discount: '35%', supplier: 'Armacell / Den Braven' },
              ].map((r, idx) => (
                <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200">{r.group}</div>
                    <div className="text-[11px] text-slate-500">Partner: {r.supplier}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-sm">-{r.discount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              <span>Maržový simulátor nákupu</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Při nákupu komponentů z B2B velkoobchodních ceníků systém automaticky kalkuluje výhodnost dodávek a porovnává nákupní cenu s rozpočtovým limitem stavby.
            </p>
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Průměrná nákupní úspora na projektu:</span>
                <span className="font-bold font-mono text-emerald-400">34.8%</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Celková hodnota otevřených poptávek:</span>
                <span className="font-bold font-mono text-cyan-300">468 000 Kč</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: POPTAVKY RFQ */}
      {activeSubTab === 'poptavky' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Send className="w-5 h-5 text-blue-400" />
              <span>Otevřená Poptávková Řízení (RFQ)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Číslo RFQ</th>
                  <th className="py-3 px-4">Projekt / Stavba</th>
                  <th className="py-3 px-4">Položek</th>
                  <th className="py-3 px-4">Odhadovaná hodnota</th>
                  <th className="py-3 px-4">Požadovaný termín</th>
                  <th className="py-3 px-4">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rfqs.map(rfq => (
                  <tr key={rfq.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{rfq.rfqNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-200">{rfq.projectName}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{rfq.itemsCount} ks</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {rfq.estimatedTotal.toLocaleString('cs-CZ')} Kč
                    </td>
                    <td className="py-3 px-4 text-slate-400">{rfq.requiredDate}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {rfq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: OBJEDNAVKY PO */}
      {activeSubTab === 'objednavky' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <span>Nákupní Objednávky Dodavatelům (PO)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Číslo PO</th>
                  <th className="py-3 px-4">Dodavatel</th>
                  <th className="py-3 px-4">Projekt</th>
                  <th className="py-3 px-4">Celková částka</th>
                  <th className="py-3 px-4">Očekávané dodání</th>
                  <th className="py-3 px-4">Stav objednávky</th>
                  <th className="py-3 px-4 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{order.poNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-200">{order.supplierName}</td>
                    <td className="py-3 px-4 text-slate-300">{order.projectName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {order.totalAmount.toLocaleString('cs-CZ')} Kč
                    </td>
                    <td className="py-3 px-4 text-slate-400">{order.expectedDelivery}</td>
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        onChange={e => onUpdateOrderStatus(order.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-cyan-400 focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="INVOICED">INVOICED</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {order.status === 'DELIVERED' && (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                          Naskladněno
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add SKU Modal */}
      {showAddSkuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>Přidat Nové SKU do VZT Katalogu</span>
            </h3>

            <form onSubmit={handleCreateSku} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU Kód</label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={e => setNewSku(e.target.value)}
                    required
                    placeholder="SPIRO-315-3M"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategorie</label>
                  <select
                    value={newCat}
                    onChange={e => setNewCat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="SPIRO">Spiro potrubí</option>
                    <option value="CTYRHATNE">Čtyřhranné potrubí</option>
                    <option value="TLUMICE">Tlumiče hluku</option>
                    <option value="KLAPKY">Požární klapky</option>
                    <option value="VENTILY">Talířové ventily</option>
                    <option value="SPOJOVACI">Spojovací materiál</option>
                    <option value="CHEMIE">Tmely a těsnění</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Název komponentu</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  placeholder="Spiro potrubí pozink d315 / 3m"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nákup (Kč)</label>
                  <input
                    type="number"
                    value={newWsPrice}
                    onChange={e => setNewWsPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prodej (Kč)</label>
                  <input
                    type="number"
                    value={newStdPrice}
                    onChange={e => setNewStdPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Poč. sklad</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal => setShowAddSkuModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Vložit do katalogu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
