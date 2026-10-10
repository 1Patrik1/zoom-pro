import { vztRepo } from '../repositories/vzt.repo.js';

export const vztService = {
  async create(user, payload) {
    return vztRepo.createComponentAndUpdateConsumables({
      companyId: user.companyId,
      type: payload.type,
      width: payload.width,
      height: payload.height,
      length: payload.length,
      angle: payload.angle
    });
  }
};
