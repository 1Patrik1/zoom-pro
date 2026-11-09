import { plansRepo } from '../repositories/plans.repo.js';
import { HttpError } from '../utils/http-error.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function inferFormatFromFileName(fileName = '') {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.dxf')) return 'DXF';
  if (lower.endsWith('.dwg')) return 'DWG';
  if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'IMAGE';
  return null;
}

function resolveFormat(payload) {
  if (payload.format) return payload.format;
  const inferred = inferFormatFromFileName(payload.fileName || payload.fileUrl || '');
  if (!inferred) {
    throw new HttpError(400, 'Formát výkresu se nepodařilo určit; zadejte format explicitně (IMAGE, PDF, DXF, DWG).');
  }
  return inferred;
}

export const plansService = {
  async list(companyId, filters) {
    const result = await plansRepo.list(companyId, filters);
    return result.rows;
  },

  async get(companyId, id) {
    const result = await plansRepo.get(companyId, id);
    if (!result.rows.length) throw new HttpError(404, 'Výkres nenalezen');
    return result.rows[0];
  },

  async create(companyId, uploaderId, payload) {
    const projectCheck = await plansRepo.validateProjectReference(companyId, payload.projectId);
    if (!projectCheck.rows.length) {
      throw new HttpError(404, 'Projekt nebyl nalezen ve vaší firmě.');
    }

    const format = resolveFormat(payload);
    const result = await plansRepo.create({
      companyId,
      projectId: payload.projectId,
      title: payload.title,
      discipline: payload.discipline || 'OTHER',
      format,
      fileUrl: payload.fileUrl,
      fileName: payload.fileName || null,
      fileSizeBytes: payload.fileSizeBytes || null,
      version: 1,
      parentPlanId: null,
      uploadedBy: uploaderId,
      note: payload.note || null
    });
    return result.rows[0];
  },

  /** Nahraje novou verzi existujícího výkresu (stejný rodokmen, vyšší version). */
  async createVersion(companyId, uploaderId, parentId, payload) {
    const parent = await plansService.get(companyId, parentId);

    const format = payload.format || payload.fileName ? resolveFormat(payload) : parent.format;
    const result = await plansRepo.create({
      companyId,
      projectId: parent.projectId,
      title: payload.title || parent.title,
      discipline: payload.discipline || parent.discipline,
      format,
      fileUrl: payload.fileUrl,
      fileName: payload.fileName || null,
      fileSizeBytes: payload.fileSizeBytes || null,
      version: (parent.version || 1) + 1,
      parentPlanId: parent.id,
      uploadedBy: uploaderId,
      note: payload.note || null
    });
    return result.rows[0];
  },

  async archive(companyId, id) {
    const result = await plansRepo.archive(companyId, id);
    if (!result.rows.length) throw new HttpError(404, 'Výkres nenalezen');
    return result.rows[0];
  },

  async listMarkers(companyId, planId) {
    await plansService.get(companyId, planId);
    const result = await plansRepo.listMarkers(companyId, planId);
    return result.rows;
  },

  async createMarker(companyId, authorId, planId, payload) {
    await plansService.get(companyId, planId);
    const result = await plansRepo.createMarker({
      planId,
      companyId,
      authorId,
      positionX: payload.positionX,
      positionY: payload.positionY,
      pageNumber: payload.pageNumber || 1,
      text: payload.text
    });
    return result.rows[0];
  },

  async deleteMarker(companyId, markerId) {
    const result = await plansRepo.deleteMarker(companyId, markerId);
    if (!result.rows.length) throw new HttpError(404, 'Značka nenalezena');
    return { ok: true };
  }
};
