import { inventoryRepo } from '../repositories/inventory.repo.js';

export const inventoryService = {
  async createItem(user, payload) {
    const result = await inventoryRepo.createItem({
      companyId: user.companyId,
      name: payload.name,
      code: payload.code,
      quantity: payload.quantity,
      unit: payload.unit,
      minQuantity: payload.minQuantity,
      location: payload.location,
      supplierId: payload.supplierId,
      purchasePrice: payload.purchasePrice,
      sellPrice: payload.sellPrice,
      category: payload.category
    });

    return result.rows[0];
  },

  async createMovement(user, payload) {
    return inventoryRepo.createMovement({
      companyId: user.companyId,
      itemId: payload.itemId,
      type: payload.type,
      quantity: payload.quantity,
      projectId: payload.projectId,
      note: payload.note,
      documentRef: payload.documentRef,
      createdBy: user.id
    });
  }
};
