// (10) EXIF geotag — vloží GPS do JPEG data-URL fotky
// Zjednodušený zápis EXIF hlavičky (GPS IFD) pro forensní auditní stopu.

function toRational(num, denom = 1) {
  return [num, denom];
}
function toDMSRational(deg) {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = Math.round(((abs - d) * 60 - m) * 60 * 100);
  return [toRational(d), toRational(m), toRational(s, 100)];
}

/**
 * Vloží GPS EXIF do JPEG data-URL. Používá piexifjs (dynamický import).
 * Pokud piexif není k dispozici (např. bez sítě), vrátí originál + samostatný sidecar objekt.
 */
export async function embedGpsExif(dataUrl, { lat, lng, accuracy, timestamp = Date.now() }) {
  try {
    const piexif = (await import('piexifjs')).default;
    const zeroth = {};
    const gps = {
      [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? 'N' : 'S',
      [piexif.GPSIFD.GPSLatitude]: toDMSRational(lat),
      [piexif.GPSIFD.GPSLongitudeRef]: lng >= 0 ? 'E' : 'W',
      [piexif.GPSIFD.GPSLongitude]: toDMSRational(lng),
      [piexif.GPSIFD.GPSTimeStamp]: [[new Date(timestamp).getUTCHours(), 1], [new Date(timestamp).getUTCMinutes(), 1], [new Date(timestamp).getUTCSeconds(), 1]],
      [piexif.GPSIFD.GPSDateStamp]: new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, ':'),
      [piexif.GPSIFD.GPSHPositioningError]: [Math.round((accuracy || 0) * 100), 100],
    };
    zeroth[piexif.ImageIFD.Software] = 'Zoom Pro Monter v1';
    const exifStr = piexif.dump({ '0th': zeroth, GPS: gps });
    return piexif.insert(exifStr, dataUrl);
  } catch {
    // Fallback: vrací sidecar (backend si to zapíše zvlášť)
    return dataUrl + `#gps=${lat.toFixed(6)},${lng.toFixed(6)},${accuracy || 0}`;
  }
}
