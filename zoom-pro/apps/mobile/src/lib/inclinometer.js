// (5) Kompas + úhloměr — gyroskop / accelerometer / DeviceOrientation
export function startInclinometer({ onSample }) {
  let watching = true;

  const handler = (e) => {
    if (!watching) return;
    // beta = X axis (front-to-back), gamma = Y axis (left-to-right), alpha = compass
    const pitchDeg = Math.round(e.beta || 0);     // sklon dopředu/dozadu
    const rollDeg  = Math.round(e.gamma || 0);    // sklon do stran
    const compassDeg = Math.round(e.webkitCompassHeading ?? (360 - (e.alpha || 0)));
    // Sklon osy potrubí = |beta| pokud držíš telefon podél trubky
    const slopeDeg = Math.abs(pitchDeg);
    // Sklon v procentech (100 % = 45°)
    const slopePct = Math.round(Math.tan((slopeDeg * Math.PI) / 180) * 100);
    onSample?.({ pitchDeg, rollDeg, compassDeg, slopeDeg, slopePct, raw: e });
  };

  async function begin() {
    // iOS 13+ vyžaduje permission handshake
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') throw new Error('Bez oprávnění pro senzory');
      } catch (e) { throw e; }
    }
    window.addEventListener('deviceorientation', handler, true);
  }
  begin().catch(() => {});

  return () => { watching = false; window.removeEventListener('deviceorientation', handler, true); };
}
