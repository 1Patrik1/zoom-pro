import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/plans.repo.js', () => ({
  plansRepo: {
    list: vi.fn(),
    get: vi.fn(),
    validateProjectReference: vi.fn(),
    create: vi.fn(),
    archive: vi.fn(),
    listMarkers: vi.fn(),
    createMarker: vi.fn(),
    deleteMarker: vi.fn()
  }
}));

import { plansRepo } from '../repositories/plans.repo.js';
import { plansService } from './plans.service.js';

describe('plans tenant reference validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a plan for a project outside the current company', async () => {
    plansRepo.validateProjectReference.mockResolvedValue({ rows: [] });

    await expect(plansService.create('company-a', 'user-a', {
      projectId: 'project-b',
      title: 'Půdorys 1.NP',
      fileUrl: 'https://example.com/plan.pdf',
      fileName: 'plan.pdf'
    })).rejects.toMatchObject({ status: 404 });

    expect(plansRepo.create).not.toHaveBeenCalled();
  });

  it('creates a plan after validating the project belongs to the company', async () => {
    plansRepo.validateProjectReference.mockResolvedValue({ rows: [{ 1: 1 }] });
    plansRepo.create.mockResolvedValue({ rows: [{ id: 'plan-a', companyId: 'company-a', format: 'PDF' }] });

    const result = await plansService.create('company-a', 'user-a', {
      projectId: 'project-a',
      title: 'Půdorys 1.NP',
      fileUrl: 'https://example.com/plan.pdf',
      fileName: 'plan.pdf'
    });

    expect(result.id).toBe('plan-a');
    expect(plansRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-a',
      uploadedBy: 'user-a',
      projectId: 'project-a',
      format: 'PDF',
      version: 1,
      parentPlanId: null
    }));
  });
});

describe('plans format inference', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['vykres.dxf', 'DXF'],
    ['vykres.DWG', 'DWG'],
    ['vykres.pdf', 'PDF'],
    ['foto.jpg', 'IMAGE'],
    ['pudorys.png', 'IMAGE']
  ])('infers format %s -> %s from file name when format is omitted', async (fileName, expectedFormat) => {
    plansRepo.validateProjectReference.mockResolvedValue({ rows: [{ 1: 1 }] });
    plansRepo.create.mockResolvedValue({ rows: [{ id: 'plan-a' }] });

    await plansService.create('company-a', 'user-a', {
      projectId: 'project-a',
      title: 'Výkres',
      fileUrl: `https://example.com/${fileName}`,
      fileName
    });

    expect(plansRepo.create).toHaveBeenCalledWith(expect.objectContaining({ format: expectedFormat }));
  });

  it('rejects an unrecognized file extension without an explicit format', async () => {
    plansRepo.validateProjectReference.mockResolvedValue({ rows: [{ 1: 1 }] });

    await expect(plansService.create('company-a', 'user-a', {
      projectId: 'project-a',
      title: 'Výkres',
      fileUrl: 'https://example.com/neznamy.xyz',
      fileName: 'neznamy.xyz'
    })).rejects.toMatchObject({ status: 400 });

    expect(plansRepo.create).not.toHaveBeenCalled();
  });
});

describe('plan versioning', () => {
  beforeEach(() => vi.clearAllMocks());

  it('increments version and links parentPlanId when creating a new version', async () => {
    plansRepo.get.mockResolvedValue({
      rows: [{ id: 'plan-a', companyId: 'company-a', projectId: 'project-a', title: 'Půdorys', discipline: 'VZT', format: 'PDF', version: 2 }]
    });
    plansRepo.create.mockResolvedValue({ rows: [{ id: 'plan-b', version: 3, parentPlanId: 'plan-a' }] });

    const result = await plansService.createVersion('company-a', 'user-b', 'plan-a', {
      fileUrl: 'https://example.com/plan-v3.pdf',
      fileName: 'plan-v3.pdf'
    });

    expect(result.id).toBe('plan-b');
    expect(plansRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'project-a',
      version: 3,
      parentPlanId: 'plan-a',
      uploadedBy: 'user-b'
    }));
  });

  it('throws 404 when versioning a plan outside the current company', async () => {
    plansRepo.get.mockResolvedValue({ rows: [] });

    await expect(plansService.createVersion('company-a', 'user-b', 'plan-x', {
      fileUrl: 'https://example.com/plan.pdf'
    })).rejects.toMatchObject({ status: 404 });
  });
});

describe('plan markers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects markers for a plan outside the current company', async () => {
    plansRepo.get.mockResolvedValue({ rows: [] });

    await expect(plansService.createMarker('company-a', 'user-a', 'plan-x', {
      positionX: 0.5,
      positionY: 0.5,
      text: 'Kolize potrubí'
    })).rejects.toMatchObject({ status: 404 });

    expect(plansRepo.createMarker).not.toHaveBeenCalled();
  });

  it('creates a marker for a plan that belongs to the company', async () => {
    plansRepo.get.mockResolvedValue({ rows: [{ id: 'plan-a', companyId: 'company-a' }] });
    plansRepo.createMarker.mockResolvedValue({ rows: [{ id: 'marker-a' }] });

    const result = await plansService.createMarker('company-a', 'user-a', 'plan-a', {
      positionX: 0.25,
      positionY: 0.75,
      pageNumber: 2,
      text: 'Zkontrolovat napojení'
    });

    expect(result.id).toBe('marker-a');
    expect(plansRepo.createMarker).toHaveBeenCalledWith(expect.objectContaining({
      planId: 'plan-a',
      companyId: 'company-a',
      authorId: 'user-a',
      positionX: 0.25,
      positionY: 0.75,
      pageNumber: 2
    }));
  });

  it('propagates 404 when deleting a marker outside the current company', async () => {
    plansRepo.deleteMarker.mockResolvedValue({ rows: [] });

    await expect(plansService.deleteMarker('company-a', 'marker-x')).rejects.toMatchObject({ status: 404 });
  });
});
