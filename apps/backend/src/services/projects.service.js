import { projectsRepo } from '../repositories/projects.repo.js';
import { HttpError } from '../utils/http-error.js';
import { query } from '../config/db.js';
import { notificationsService } from './notifications.service.js';

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

function requiredBreakMinutes(start, end) {
  const minutes = (value) => {
    const [hours, mins] = String(value || '').split(':').map(Number);
    return hours * 60 + mins;
  };
  const duration = (minutes(end) - minutes(start) + 1440) % 1440;
  return duration >= 8 * 60 ? 60 : 30;
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
    shiftStart: payload.shiftStart || "07:00",
    shiftEnd: payload.shiftEnd || "18:00",
    breakMinutes: requiredBreakMinutes(payload.shiftStart || "07:00", payload.shiftEnd || "18:00"),
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

  async remove(user, projectId) {
    ensureProjectManager(user, 'Nemáte oprávnění mazat projekty');
    const result = await projectsRepo.remove(projectId, user.companyId);
    if (!result.rows[0]) throw new HttpError(404, 'Projekt nebyl nalezen');
    return { ok: true, projectId: result.rows[0].id };
  },

  async assign(user, payload) {
    ensureProjectManager(user, 'Nemáte oprávnění přiřazovat tým');
    if (payload.assign) {
      const membership = await query(
        `SELECT p.id
           FROM "Project" p
           JOIN "User" u ON u.id = $2 AND u."companyId" = $3
          WHERE p.id = $1 AND p."companyId" = $3`,
        [payload.projectId, payload.userId, user.companyId]
      );
      if (!membership.rows.length) throw new HttpError(404, 'Projekt nebo člen týmu nebyl nalezen ve vaší firmě.');
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

    const project = await query(
      'SELECT id FROM "Project" WHERE id = $1 AND "companyId" = $2',
      [payload.projectId, user.companyId]
    );
    if (!project.rows.length) throw new HttpError(404, 'Projekt nebyl nalezen ve vaší firmě.');

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

    // Push only to this project's assigned teammates, never to unrelated company users.
    query(
      `SELECT DISTINCT u.id, p.name AS "projectName" FROM "ProjectAssignment" pa
       JOIN "User" u ON u.id = pa."userId"
       JOIN "Project" p ON p.id = pa."projectId" AND p."companyId" = pa."companyId"
       WHERE pa."projectId" = $1 AND pa."companyId" = $2 AND u.id <> $3`,
      [payload.projectId, user.companyId, user.id]
    ).then(({ rows }) => notificationsService.createForUsers(rows.map((row) => row.id), {
      title: `Projektový chat · ${rows[0]?.projectName || 'nová zpráva'}`,
      body: `${[user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email}: ${text || 'Poslal(a) fotografii'}`.slice(0, 1000),
      type: 'project',
      data: { type: 'project-chat', projectId: String(payload.projectId), chatId: String(chat.id) }
    })).catch((error) => console.warn('[notifications] Project chat notification failed:', error.message));

    return {
      ...chat,
      attachments,
      authorName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
    };
  }
};
