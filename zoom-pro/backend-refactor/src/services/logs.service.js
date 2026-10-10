import { logsRepo } from '../repositories/logs.repo.js';

export const logsService = {
  async create(user, payload) {
    const result = await logsRepo.create({
      companyId: user.companyId,
      projectId: payload.projectId || null,
      authorId: user.id,
      date: payload.date,
      weather: payload.weather,
      content: payload.content
    });
    return result.rows[0];
  }
};
