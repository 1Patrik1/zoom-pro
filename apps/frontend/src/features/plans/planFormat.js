const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

export const PLAN_FORMATS = ['IMAGE', 'PDF', 'DXF', 'DWG'];
export const PLAN_DISCIPLINES = ['VZT', 'ELEKTRO', 'VODA', 'TOPENI', 'STAVEBNI', 'SITUACE', 'OTHER'];

export const DISCIPLINE_LABELS = {
  VZT: 'VZT',
  ELEKTRO: 'Elektro',
  VODA: 'Voda',
  TOPENI: 'Topení',
  STAVEBNI: 'Stavební',
  SITUACE: 'Situace',
  OTHER: 'Ostatní'
};

export const FORMAT_LABELS = {
  IMAGE: 'Obrázek',
  PDF: 'PDF',
  DXF: 'DXF',
  DWG: 'DWG'
};

/** Odvodí formát výkresu z názvu souboru; vrací null, pokud se nepodařilo rozpoznat. */
export function inferFormatFromFileName(fileName = '') {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.dxf')) return 'DXF';
  if (lower.endsWith('.dwg')) return 'DWG';
  if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'IMAGE';
  return null;
}
