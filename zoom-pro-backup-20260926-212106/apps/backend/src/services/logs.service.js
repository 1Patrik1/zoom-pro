import { logsRepo } from '../repositories/logs.repo.js';

function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .filter((item) => item.startsWith('data:image/') || item.startsWith('http://') || item.startsWith('https://'))
    .slice(0, 4);
}

export const logsService = {
  async create(user, payload) {
    const result = await logsRepo.create({
      companyId: user.companyId,
      projectId: payload.projectId || null,
      authorId: user.id,
      date: payload.date,
      weather: payload.weather,
      content: payload.content,
      attachments: sanitizeAttachments(payload.attachments)
    });
    return result.rows[0];
  }
};
