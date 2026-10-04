import { troubleshootingRepo } from '../repositories/troubleshooting.repo.js';
import { syncRepo } from '../repositories/sync.repo.js';

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function detectCategory(text) {
  const t = String(text || '').toLowerCase();
  if (/koliz|stret|rozpor|prekryv/.test(t)) return 'COLLISION';
  if (/material|sklad|chybi|doslo|malo/.test(t)) return 'MATERIAL';
  if (/teplo|hluk|vibr|hlučn|klep/.test(t)) return 'NOISE_HAPTIC';
  if (/netěs|unika|kape|sraz/.test(t)) return 'LEAK';
  if (/mont|spoj|svar|roura|kolen/.test(t)) return 'ASSEMBLY';
  if (/elektr|kabel|svorka/.test(t)) return 'ELECTRICAL';
  if (/ vzduch|ventil|tlak|prutok/.test(t)) return 'AIR_FLOW';
  return 'OTHER';
}

function detectSeverity(text) {
  const t = String(text || '').toLowerCase();
  if (/krit|nepro|nefung|havari|leak|explod|stop/.test(t)) return 'CRITICAL';
  if (/risk|koliz|chy|malo|krute/.test(t)) return 'WARNING';
  return 'INFO';
}

function generateAnswer({ category, severity, relatedMaterials, relatedAttendances }) {
  const moves = relatedMaterials.length;
  const oor = relatedAttendances.filter((a) => a.geoStatus === 'OUT_OF_RADIUS').length;
  const lowStock = relatedMaterials.filter((m) => n(m.quantityAfter) <= n(m.minQuantity)).length;
  const lines = [];
  lines.push(`Kategorie: ${category} · Závažnost: ${severity}`);
  if (moves) lines.push(`V posledních skladových pohybech najdeme ${moves} záznamů, z toho ${lowStock} pod minimem.`);
  if (oor) lines.push(`U docházky najdeme ${oor} záznamů mimo rádius projektu – ověřte GPS vazbu na stavbu.`);
  if (category === 'MATERIAL') lines.push('Doporučuji doplnit zásobu a ověřit vazbu QR kódu na projekt.');
  if (category === 'COLLISION') lines.push('Porovnej přiřazení pracovníků na projektu a časové překryvy.');
  if (category === 'LEAK') lines.push('Doporučuji zkontrolovat spoj + dotáhnout přírubu, ověřit těsnění.');
  if (category === 'NOISE_HAPTIC') lines.push('Ověřit uložení na podpěrách a průchodky, případně přidat tlumič.');
  if (category === 'AIR_FLOW') lines.push('Změř rychlost proudění v řezu, ověř tlak a dimenze kanálu.');
  if (category === 'ASSEMBLY') lines.push('Ověř montážní postup dle TDS, dotáhni šrouby a proveď kontrolu spáry.');
  if (category === 'ELECTRICAL') lines.push('Proveď revizi připojení, ověř izolační stav, doporučuji termokameru.');
  lines.push('Přilož fotku a stručný zápis do deníku, všechny akce ukládej s referencí na projekt.');
  return lines.join('\n');
}

export const troubleshootingService = {
  async listForProject(user, projectId) {
    const result = await troubleshootingRepo.listForProject(user.companyId, projectId);
    return result.rows;
  },

  async create(user, payload) {
    const result = await troubleshootingRepo.create({
      companyId: user.companyId,
      projectId: payload.projectId,
      userId: user.id,
      title: payload.title,
      description: payload.description,
      imageUrl: payload.imageUrl || null,
      category: payload.category || detectCategory(payload.title + ' ' + payload.description),
      severity: payload.severity || detectSeverity(payload.title + ' ' + payload.description),
      relatedMaterials: payload.relatedMaterials || [],
      relatedAttendances: payload.relatedAttendances || []
    });
    const row = result.rows[0];
    const answer = generateAnswer({
      category: row.category,
      severity: row.severity,
      relatedMaterials: row.relatedMaterials,
      relatedAttendances: row.relatedAttendances
    });
    const update = await troubleshootingRepo.updateAnswer(user.companyId, row.id, answer);
    return update.rows[0];
  },

  async proposeAnalysis(user, payload) {
    // AI asistent – bez ukládání, vrátí návrhy
    const category = detectCategory(payload.text || payload.title || '');
    const severity = detectSeverity(payload.text || payload.title || '');
    const answer = generateAnswer({ category, severity, relatedMaterials: [], relatedAttendances: [] });
    return { category, severity, answer };
  },

  async gatherContext(user, projectId) {
    const cid = user.companyId;
    const [items, attendance, movements] = await Promise.all([
      syncRepo.getInventoryItems(cid),
      syncRepo.getAttendance(cid),
      syncRepo.getInventoryMovements(cid)
    ]);
    const projectAttendance = attendance.rows.filter((a) => a.projectId === projectId);
    const projectMovements = movements.rows.filter((m) => m.projectId === projectId);
    const itemIds = new Set(projectMovements.map((m) => m.itemId));
    const projectMaterials = items.rows.filter((i) => itemIds.has(i.id)).map((i) => ({
      itemId: i.id,
      name: i.name,
      quantityAfter: i.quantity,
      minQuantity: i.minQuantity
    }));
    return { projectMaterials, projectAttendance: projectAttendance.slice(0, 50) };
  }
};
