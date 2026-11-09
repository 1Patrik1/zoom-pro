/** Přečte soubor jako data: URL (base64), bez komprese — DXF/DWG/PDF musí zůstat beze změny. */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Soubor se nepodařilo načíst'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
