import { projectsRepo } from '../repositories/projects.repo.js';
import { HttpError } from '../utils/http-error.js';

const MANAGER_ROLES = ['SUPERADMIN', 'REDITEL', 'VEDOUCI'];

function ensureProjectManager(user, message) {
  if (!MANAGER_ROLES.includes(user.role)) throw new HttpError(403, message);
}

function sanitizeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sanitizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeProjectPayload(payload) {
  return {
    name: payload.name?.trim(),
    code: payload.code?.trim() || null,
    clientName: payload.clientName?.trim() || null,
    address: payload.address?.trim() || null,
    lat: sanitizeNumber(payload.lat),
    lng: sanitizeNumber(payload.lng),
    radius: sanitizeNumber(payload.radius) ?? 100,
    budget: sanitizeNumber(payload.budget),
    status: payload.status?.trim() || 'ACTIVE',
    plannedStart: sanitizeDate(payload.plannedStart),
    plannedEnd: sanitizeDate(payload.plannedEnd),
    gpsMode: payload.gpsMode?.trim() || 'MANUAL',
    locationNote: payload.locationNote?.trim() || null,
    locationUpdatedAt: payload.lat !== undefined || payload.lng !== undefined || payload.address !== undefined ? new Date().toISOString() : null
  };
}

function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .filter((item) => item.startsWith('data:image/') || item.startsWith('http://') || item.startsWith('https://'))
    .slice(0, 4);
}

export const projectsService = {
  async create(user, payload) {
    ensureProjectManager(user, 'Nemáte oprávnění zakládat projekty');
    const result = await projectsRepo.create(user.companyId, sanitizeProjectPayload(payload));
    return result.rows[0];
  },

  async update(user, payload) {
    ensureProjectManager(user, 'Nemáte oprávnění upravovat projekty');
    const result = await projectsRepo.update(payload.projectId, user.companyId, sanitizeProjectPayload(payload));
    if (!result.rows[0]) throw new HttpError(404, 'Projekt nebyl nalezen');
    return result.rows[0];
  },

  async assign(user, payload) {
    ensureProjectManager(user, 'Nemáte oprávnění přiřazovat tým');
    if (payload.assign) {
      const result = await projectsRepo.assign(payload.projectId, payload.userId, user.companyId);
      return result.rows[0] || { ok: true };
    }
    await projectsRepo.unassign(payload.projectId, payload.userId, user.companyId);
    return { ok: true };
  },

  async createChat(user, payload) {
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    const attachments = sanitizeAttachments(payload.attachments);

    if (!text && !attachments.length) {
      throw new HttpError(400, 'Zpráva musí obsahovat text nebo alespoň jednu fotku');
    }

    const chatResult = await projectsRepo.createChat(
      payload.projectId,
      user.id,
      user.companyId,
      text || '📷 Foto ze stavby',
      attachments[0] || null,
      attachments.length,
      attachments.length ? 'IMAGE' : null
    );

    const chat = chatResult.rows[0];
    if (attachments.length) {
      await projectsRepo.addGalleryItems(payload.projectId, user.id, user.companyId, chat.id, attachments, text || null);
    }

    return {
      ...chat,
      attachments,
      authorName: user.email
    };
  }
};
