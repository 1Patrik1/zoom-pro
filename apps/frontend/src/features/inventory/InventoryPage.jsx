import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, PackagePlus, QrCode, ScanSearch, Truck } from 'lucide-react';

const DEFAULT_ITEM_FORM = {
  name: '',
  code: '',
  quantity: '1',
  unit: 'ks',
  minQuantity: '0',
  location: '',
  supplierId: '',
  purchasePrice: '',
  sellPrice: '',
  category: ''
};

const DEFAULT_MOVEMENT_FORM = {
  itemId: '',
  type: 'ISSUE',
  quantity: '1',
  projectId: '',
  note: '',
  documentRef: ''
};

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n(value));
}

export function InventoryPage({ db, onCreateItem, onCreateMovement }) {
  const items = db.inventoryItems || [];
  const movements = db.inventoryMovements || [];
  const projects = db.projects || [];
  const screws = db.consumables?.totalScrews ?? 0;
  const tape = db.consumables?.totalTapeMeters ?? 0;

  const [itemForm, setItemForm] = useState(DEFAULT_ITEM_FORM);
  const [movementForm, setMovementForm] = useState(DEFAULT_MOVEMENT_FORM);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);

  const lowStockItems = useMemo(
    () => items.filter((item) => n(item.quantity) <= n(item.minQuantity)),
    [items]
  );

  const stockValue = useMemo(
    () => items.reduce((sum, item) => sum + n(item.quantity) * n(item.purchasePrice), 0),
    [items]
  );

  const searchNeedle = (scannedCode || manualSearch).trim().toLowerCase();
  const matchedItem = useMemo(
    () => items.find((item) => String(item.code || '').toLowerCase() === String(scannedCode || '').toLowerCase()) || null,
    [items, scannedCode]
  );

  const visibleItems = useMemo(() => {
    if (!searchNeedle) return items;
    return items.filter((item) => {
      const haystack = `${item.name || ''} ${item.code || ''} ${item.category || ''} ${item.location || ''}`.toLowerCase();
      return haystack.includes(searchNeedle);
    });
  }, [items, searchNeedle]);

  useEffect(() => () => stopScanner(), []);

  async function startScanner() {
    setError('');
    setSuccess('');
    if (!window.BarcodeDetector) {
      setScannerMessage('Tento prohlížeč neumí BarcodeDetector. Použij ruční kód nebo sken ze souboru.');
      setScannerOpen(false);
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScannerOpen(true);
      setScannerMessage('Kamera běží. Namiř QR kód materiálu do středu záběru.');
      scanFrame();
    } catch (err) {
      setScannerMessage('Kameru se nepodařilo spustit. Zkontroluj oprávnění prohlížeče.');
      setError(err.message || 'Nepodařilo se spustit kameru');
      stopScanner();
    }
  }

  function stopScanner() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerOpen(false);
  }

  async function scanFrame() {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length) {
        const value = barcodes[0].rawValue || '';
        applyScannedCode(value);
        stopScanner();
        return;
      }
    } catch (_err) {
      // ignore transient detector errors
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }

  async function handleFileScan(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');

    if (!window.BarcodeDetector) {
      setError('Sken ze souboru vyžaduje BarcodeDetector v prohlížeči.');
      return;
    }

    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);
      if (!barcodes.length) {
        setError('Na obrázku nebyl nalezen QR kód.');
        return;
      }
      applyScannedCode(barcodes[0].rawValue || '');
    } catch (err) {
      setError(err.message || 'Sken obrázku selhal.');
    } finally {
      event.target.value = '';
    }
  }

  function applyScannedCode(value) {
    const code = String(value || '').trim();
    if (!code) return;
    setScannedCode(code);
    setManualSearch(code);
    setScannerMessage(`Načtený QR kód: ${code}`);
    setItemForm((prev) => ({ ...prev, code, name: prev.name || '' }));
    const found = items.find((item) => String(item.code || '').toLowerCase() === code.toLowerCase());
    if (found) {
      setMovementForm((prev) => ({ ...prev, itemId: found.id }));
      setSuccess(`Materiál ${found.name} byl nalezen podle QR kódu.`);
    } else {
      setSuccess('QR kód zatím není přiřazen k materiálu. Můžeš založit novou položku.');
    }
  }

  async function submitItem(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await onCreateItem({
        ...itemForm,
        quantity: Number(itemForm.quantity),
        minQuantity: Number(itemForm.minQuantity || 0),
        purchasePrice: itemForm.purchasePrice === '' ? undefined : Number(itemForm.purchasePrice),
        sellPrice: itemForm.sellPrice === '' ? undefined : Number(itemForm.sellPrice)
      });
      setItemForm({ ...DEFAULT_ITEM_FORM, code: scannedCode || '' });
      setSuccess('Materiál byl uložen do skladu.');
    } catch (err) {
      setError(err.message || 'Uložení materiálu selhalo.');
    } finally {
      setBusy(false);
    }
  }

  async function submitMovement(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await onCreateMovement({
        ...movementForm,
        quantity: Number(movementForm.quantity),
        projectId: movementForm.projectId || undefined
      });
      setMovementForm((prev) => ({ ...DEFAULT_MOVEMENT_FORM, itemId: prev.itemId }));
      setSuccess('Skladový pohyb byl uložen.');
    } catch (err) {
      setError(err.message || 'Skladový pohyb selhal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard icon={PackagePlus} label="Materiálové položky" value={items.length} note="Evidované položky skladu" color="blue" />
        <StatCard icon={AlertTriangle} label="Pod minimem" value={lowStockItems.length} note="Položky vyžadující doplnění" color="amber" />
        <StatCard icon={Truck} label="Odhad nákupní hodnoty" value={money(stockValue)} note="Dle pořizovacích cen" color="emerald" />
        <StatCard icon={CheckCircle2} label="Spotřební přehled" value={`${screws} / ${tape} m`} note="Šrouby / páska" color="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">QR čtečka materiálu</p>
              <h2 className="mt-2 text-2xl font-black text-white">Rychlé načtení a výdej</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={scannerOpen ? stopScanner : startScanner} className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200">
                <Camera className="mr-2 inline h-4 w-4" />
                {scannerOpen ? 'Zastavit kameru' : 'Spustit kameru'}
              </button>
              <label className="cursor-pointer rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200">
                <QrCode className="mr-2 inline h-4 w-4" />
                Sken z obrázku
                <input type="file" accept="image/*" className="hidden" onChange={handleFileScan} />
              </label>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
              <div className="aspect-video bg-black/60">
                {scannerOpen ? (
                  <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                    Připrav skenování kamerou nebo načti QR kód z fotky materiálu.
                  </div>
                )}
              </div>
              <div className="border-t border-slate-800 px-4 py-3 text-sm text-slate-300">{scannerMessage || 'QR modul je připraven.'}</div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-4">
              <label className="block text-sm font-semibold text-slate-300">
                Hledat kód nebo název
                <input value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="např. VZT-KOLENO-200" />
              </label>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Načtený QR</p>
                <p className="mt-2 break-all text-lg font-bold text-white">{scannedCode || 'Zatím nic nenačteno'}</p>
                <p className="mt-2 text-sm text-slate-400">Kód se použije pro předvyplnění nového materiálu nebo rychlý výdej.</p>
              </div>

              {matchedItem ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black">Materiál rozpoznán</p>
                      <p className="mt-1 text-base font-semibold">{matchedItem.name}</p>
                    </div>
                    <button type="button" onClick={() => setMovementForm((prev) => ({ ...prev, itemId: matchedItem.id }))} className="rounded-xl border border-emerald-400/40 px-3 py-2 font-bold text-emerald-100">
                      Použít do výdeje
                    </button>
                  </div>
                  <p className="mt-2 text-emerald-200/80">Stav: {n(matchedItem.quantity)} {matchedItem.unit} · Lokace: {matchedItem.location || 'neuvedeno'}</p>
                </div>
              ) : null}

              {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
              {success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <form onSubmit={submitMovement} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">Výdej / příjem</p>
            <h2 className="mt-2 text-2xl font-black text-white">Skladový pohyb</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Materiál">
                <select value={movementForm.itemId} onChange={(e) => setMovementForm((prev) => ({ ...prev, itemId: e.target.value }))} className="field">
                  <option value="">Vyber položku</option>
                  {items?.map((item) => <option key={item.id} value={item.id}>{item.name} {item.code ? `(${item.code})` : ''}</option>)}
                </select>
              </Field>
              <Field label="Typ pohybu">
                <select value={movementForm.type} onChange={(e) => setMovementForm((prev) => ({ ...prev, type: e.target.value }))} className="field">
                  <option value="ISSUE">Výdej na stavbu</option>
                  <option value="RECEIPT">Příjem na sklad</option>
                  <option value="RETURN">Vrácení na sklad</option>
                  <option value="ADJUSTMENT">Korekce skladu</option>
                  <option value="WRITE_OFF">Odpis</option>
                </select>
              </Field>
              <Field label="Množství">
                <input type="number" step="0.01" value={movementForm.quantity} onChange={(e) => setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))} className="field" />
              </Field>
              <Field label="Projekt">
                <select value={movementForm.projectId} onChange={(e) => setMovementForm((prev) => ({ ...prev, projectId: e.target.value }))} className="field">
                  <option value="">Bez projektu</option>
                  {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </Field>
              <Field label="Doklad / reference">
                <input value={movementForm.documentRef} onChange={(e) => setMovementForm((prev) => ({ ...prev, documentRef: e.target.value }))} className="field" placeholder="např. výdejka 24-006" />
              </Field>
              <Field label="Poznámka">
                <input value={movementForm.note} onChange={(e) => setMovementForm((prev) => ({ ...prev, note: e.target.value }))} className="field" placeholder="Kam se materiál použil" />
              </Field>
            </div>
            <button disabled={busy} className="mt-4 rounded-2xl bg-amber-500 px-5 py-3 font-black text-slate-950 disabled:opacity-60">Uložit pohyb</button>
          </form>

          <form onSubmit={submitItem} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Nový materiál</p>
            <h2 className="mt-2 text-2xl font-black text-white">Založení skladové položky</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Název">
                <input required value={itemForm.name} onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))} className="field" placeholder="např. Koleno 200/45" />
              </Field>
              <Field label="QR / kód">
                <input value={itemForm.code} onChange={(e) => setItemForm((prev) => ({ ...prev, code: e.target.value }))} className="field" placeholder="unikátní kód materiálu" />
              </Field>
              <Field label="Počáteční množství">
                <input type="number" step="0.01" value={itemForm.quantity} onChange={(e) => setItemForm((prev) => ({ ...prev, quantity: e.target.value }))} className="field" />
              </Field>
              <Field label="Jednotka">
                <input value={itemForm.unit} onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))} className="field" placeholder="ks / m / bal" />
              </Field>
              <Field label="Minimum">
                <input type="number" step="0.01" value={itemForm.minQuantity} onChange={(e) => setItemForm((prev) => ({ ...prev, minQuantity: e.target.value }))} className="field" />
              </Field>
              <Field label="Lokace">
                <input value={itemForm.location} onChange={(e) => setItemForm((prev) => ({ ...prev, location: e.target.value }))} className="field" placeholder="Sklad A / regál 3" />
              </Field>
              <Field label="Kategorie">
                <input value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))} className="field" placeholder="Potrubí / spojovací" />
              </Field>
              <Field label="Dodavatel">
                <input value={itemForm.supplierId} onChange={(e) => setItemForm((prev) => ({ ...prev, supplierId: e.target.value }))} className="field" placeholder="Interní kód dodavatele" />
              </Field>
              <Field label="Nákupní cena">
                <input type="number" step="0.01" value={itemForm.purchasePrice} onChange={(e) => setItemForm((prev) => ({ ...prev, purchasePrice: e.target.value }))} className="field" />
              </Field>
              <Field label="Prodejní cena">
                <input type="number" step="0.01" value={itemForm.sellPrice} onChange={(e) => setItemForm((prev) => ({ ...prev, sellPrice: e.target.value }))} className="field" />
              </Field>
            </div>
            <button disabled={busy} className="mt-4 rounded-2xl bg-blue-500 px-5 py-3 font-black text-white disabled:opacity-60">Uložit materiál</button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Položky skladu</p>
              <h2 className="mt-2 text-2xl font-black text-white">Přehled materiálu</h2>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300">
              <ScanSearch className="mr-2 inline h-4 w-4" /> {visibleItems.length} / {items.length}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visibleItems.length ? visibleItems?.map((item) => {
              const low = n(item.quantity) <= n(item.minQuantity);
              return (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.code || 'bez QR kódu'} · {item.location || 'bez lokace'} · {item.category || 'bez kategorie'}</p>
                    </div>
                    <button type="button" onClick={() => setMovementForm((prev) => ({ ...prev, itemId: item.id }))} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-100">Vybrat</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className={`rounded-full px-3 py-1 font-bold ${low ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}`}>Stav: {n(item.quantity)} {item.unit}</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">Minimum: {n(item.minQuantity)} {item.unit}</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">Nákup: {money(item.purchasePrice || 0)}</span>
                  </div>
                </div>
              );
            }) : <EmptyState text="Žádná skladová položka neodpovídá filtru nebo QR kódu." />}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Poslední pohyby</p>
          <h2 className="mt-2 text-2xl font-black text-white">Historie skladu</h2>
          <div className="mt-4 space-y-3">
            {movements.length ? movements?.slice(0, 12)?.map((movement) => (
              <div key={movement.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-white">{movement.itemName || 'Materiál'}</p>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">{movement.type}</span>
                </div>
                <p className="mt-2">Množství: <span className="font-bold text-white">{n(movement.quantity)}</span> · Po: <span className="font-bold text-white">{n(movement.quantityAfter)}</span></p>
                <p className="mt-1 text-slate-400">{movement.projectName || 'Bez projektu'} · {new Date(movement.createdAt).toLocaleString('cs-CZ')}</p>
              </div>
            )) : <EmptyState text="Zatím nejsou evidované žádné skladové pohyby." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, color }) {
  const colors = {
    blue: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    violet: 'text-violet-300 bg-violet-500/10 border-violet-500/20'
  };

  return (
    <div className={`rounded-3xl border p-5 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <p className="text-xs font-black uppercase tracking-[0.3em]">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{note}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-300">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 py-8 text-center text-sm text-slate-400">{text}</div>;
}
