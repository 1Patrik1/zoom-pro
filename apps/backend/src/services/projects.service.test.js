import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/projects.repo.js', () => ({
  projectsRepo: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    assign: vi.fn(),
    unassign: vi.fn(),
    createChat: vi.fn(),
    addGalleryItems: vi.fn()
  }
}));
vi.mock('../config/db.js', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
vi.mock('./notifications.service.js', () => ({ notificationsService: { createForUsers: vi.fn() } }));

import { projectsRepo } from '../repositories/projects.repo.js';
import { query } from '../config/db.js';
import { projectsService } from './projects.service.js';

describe('project tenant ownership checks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects project chat for a project owned by another company', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(projectsService.createChat(
      { id: 'user-a', companyId: 'company-a', role: 'MONTER', email: 'a@example.test' },
      { projectId: 'project-b', text: 'hello', attachments: [] }
    )).rejects.toMatchObject({ status: 404 });

    expect(projectsRepo.createChat).not.toHaveBeenCalled();
  });

  it('rejects assigning a user from another company to a project', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(projectsService.assign(
      { id: 'director-a', companyId: 'company-a', role: 'REDITEL' },
      { projectId: 'project-a', userId: 'user-b', assign: true }
    )).rejects.toMatchObject({ status: 404 });

    expect(projectsRepo.assign).not.toHaveBeenCalled();
  });

  it('allows chat after verifying the project belongs to the current company', async () => {
    query.mockResolvedValue({ rows: [{ id: 'project-a' }] });
    projectsRepo.createChat.mockResolvedValue({ rows: [{ id: 'chat-1', projectId: 'project-a' }] });

    const result = await projectsService.createChat(
      { id: 'user-a', companyId: 'company-a', role: 'MONTER', email: 'a@example.test' },
      { projectId: 'project-a', text: 'hello', attachments: [] }
    );

    expect(result.id).toBe('chat-1');
    expect(projectsRepo.createChat).toHaveBeenCalledWith('project-a', 'user-a', 'company-a', 'hello', null, 0, null);
  });
});
