import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  PackageCheck,
  Search,
  Layers,
} from 'lucide-react';
import { InventoryItem } from '../types';

interface WarehouseViewProps {
  inventory: InventoryItem[];
  onAddMovement: (itemId: string, type: 'PRIJEM' | 'VYDEJ', quantity: number, note?: string) => Promise<void>;
  onAddItem: (item: Omit<InventoryItem, 'id' | 'createdAt'>) => Promise<void>;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  inventory,
  onAddMovement,
  onAddItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<'PRIJEM' | 'VYDEJ'>('VYDEJ');
  const [moveQty, setMoveQty] = useState(10);
  const [moveNote, setMoveNote] = useState('');

  const categories = ['ALL', ...Array.from(new Set(inventory.map(i => i.category)))];

  const filteredItems = inventory.filter(item => {
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    await onAddMovement(selectedItem.id, moveType, moveQty, moveNote);
    setShowMoveModal(false);
    setMoveNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <Boxes className="w-6 h-6 text-cyan-400" />
            <span>Skladové Hospodářství & Materiál VZT</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Zásoby plechů, spojovacího materiálu, těsnění a výdejky pro montážní skupiny
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Hledat materiál podle názvu nebo kódu..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'Všechny kategorie' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredItems.map(item => {
          const isLow = item.quantity <= item.minQuantity;
          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-slate-900/90 border transition-all flex flex-col justify-between shadow-xl ${
                isLow ? 'border-amber-500/40' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">
                    {item.code}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500">{item.category}</span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm mt-2">{item.name}</h3>

                {isLow && (
                  <div className="mt-2 text-[11px] text-amber-400 flex items-center space-x-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Zásoba pod limitem ({item.minQuantity} {item.unit})</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xs text-slate-400">Aktuální stav:</span>
                  <span className={`text-xl font-extrabold font-mono ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {item.quantity} <span className="text-xs text-slate-400">{item.unit}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>Jedn. cena:</span>
                  <span className="font-mono text-slate-300 font-semibold">{item.unitCost} Kč</span>
                </div>

                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setShowMoveModal(true);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pohyb / Výdejka</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Movement Modal */}
      {showMoveModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-cyan-400" />
              <span>Skladový pohyb — {selectedItem.name}</span>
            </h3>

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Druh pohybu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMoveType('VYDEJ')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      moveType === 'VYDEJ'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Výdej na stavbu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveType('PRIJEM')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      moveType === 'PRIJEM'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Příjem od dodavatele</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Množství ({selectedItem.unit})
                </label>
                <input
                  type="number"
                  value={moveQty}
                  onChange={e => setMoveQty(parseFloat(e.target.value) || 0)}
                  min="0.1"
                  step="0.5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Číslo stavby / Příjemky / Poznámka
                </label>
                <input
                  type="text"
                  value={moveNote}
                  onChange={e => setMoveNote(e.target.value)}
                  placeholder="Např. Výdej pro montážní četu — Nemocnice Motol"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Potvrdit skladový pohyb
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
