import { attendanceRepo } from '../repositories/attendance.repo.js';

export const attendanceService = {
  async create(user, payload) {
    const result = await attendanceRepo.create({
      userId: user.id,
      companyId: user.companyId,
      projectId: payload.projectId || null,
      type: payload.type,
      status: payload.status,
      lat: payload.lat,
      lng: payload.lng
    });
    return result.rows[0];
  }
};
