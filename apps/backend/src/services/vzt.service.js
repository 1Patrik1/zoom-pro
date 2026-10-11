import { vztRepo } from '../repositories/vzt.repo.js';

export const vztService = {
  async create(user, payload) {
    return vztRepo.createComponentAndUpdateConsumables({
      companyId: user.companyId,
      type: payload.type,
      width: payload.width,
      height: payload.height,
      width2: payload.width2,
      height2: payload.height2,
      length: payload.length,
      angle: payload.angle,
      offset: payload.offset,
      note: payload.note,
      surfaceArea: payload.surfaceArea,
      weight: payload.weight,
      estimatedScrews: payload.estimatedScrews,
      estimatedTapeM: payload.estimatedTapeM,
      estimatedRivets: payload.estimatedRivets,
      estimatedSealantKg: payload.estimatedSealantKg,
      requiresAccessDoor: payload.requiresAccessDoor
    });
  }
};
