// (2) QR/EAN skener přes ML Kit (Capacitor community plugin)
export async function scanBarcode() {
  try {
    const mod = await import('@capacitor-mlkit/barcode-scanning');
    const { BarcodeScanner } = mod;
    const perm = await BarcodeScanner.requestPermissions();
    if (perm.camera !== 'granted') throw new Error('Kamera bez oprávnění');
    const result = await BarcodeScanner.scan();
    return result?.barcodes?.[0]?.rawValue || null;
  } catch (e) {
    // Web fallback: viditelný náhled kamery + BarcodeDetector API
    if ('BarcodeDetector' in window) {
      return await scanWithBarcodeDetector();
    }
    // Safari/Firefox nemají BarcodeDetector — jasná hláška hned, ne tajná chyba za běhu.
    if (typeof navigator !== 'undefined' && !('BarcodeDetector' in window) && !navigator.userAgent.includes('Capacitor')) {
      const err = new Error('Skenování na webu není v tomto prohlížeči podporováno (vyžaduje Chrome/Edge). Použij mobilní appku nebo ruční zadání kódu.');
      err.userFriendly = true;
      throw err;
    }
    throw e;
  }
}

// Web: sken s VIDITELNÝM náhledem kamery (overlay), tlačítkem Zrušit a timeoutem
async function scanWithBarcodeDetector() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f172ae6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px';

  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = 'width:min(92vw,560px);aspect-ratio:3/4;object-fit:cover;border-radius:24px;border:2px solid #38bdf8;background:#000';

  const label = document.createElement('div');
  label.textContent = 'Hledám QR / EAN kód…';
  label.style.cssText = 'color:#e2e8f0;font:600 14px system-ui';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Zrušit';
  cancelBtn.style.cssText = 'padding:10px 22px;border-radius:14px;background:#e11d48;color:#fff;font:700 14px system-ui;border:0;cursor:pointer';

  overlay.append(video, label, cancelBtn);
  document.body.appendChild(overlay);
  await video.play().catch(() => {});

  let done = false;
  const cleanup = (fn) => {
    if (done) return;
    done = true;
    stream.getTracks().forEach((t) => t.stop());
    overlay.remove();
    fn();
  };

  cancelBtn.onclick = () => cleanup(() => resolve(null));
  const timeout = setTimeout(() => cleanup(() => resolve('__SCAN_TIMEOUT__')), 45000);

  // eslint-disable-next-line no-undef
  const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128'] });
  const iv = setInterval(async () => {
    const codes = await detector.detect(video).catch(() => []);
    if (codes[0]) {
      clearInterval(iv);
      clearTimeout(timeout);
      cleanup(() => resolve(codes[0].rawValue));
    }
  }, 300);
}
