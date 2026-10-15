import { describe, expect, it } from 'vitest';
import { normalizeFullSync } from './sync-normalizer.js';

describe('normalizeFullSync', () => {
  it('keeps valid collection arrays from the API response', () => {
    const projects = [{ id: 'p1' }];
    const result = normalizeFullSync({ projects, users: [], company: { id: 'c1' } });

    expect(result.projects).toBe(projects);
    expect(result.users).toEqual([]);
    expect(result.company).toEqual({ id: 'c1' });
    expect(result.invoices).toEqual([]);
  });

  it('falls back to the previous array when the API returns a non-array collection', () => {
    const previousProjects = [{ id: 'existing-project' }];
    const previous = { projects: previousProjects };
    const result = normalizeFullSync({ projects: { error: 'unexpected shape' } }, previous);

    expect(result.projects).toBe(previousProjects);
    expect(Array.isArray(result.users)).toBe(true);
    expect(Array.isArray(result.invoices)).toBe(true);
  });

  it('safely handles null, arrays, and primitive responses', () => {
    const fallback = { projects: [{ id: 'kept' }] };

    expect(normalizeFullSync(null, fallback)).toBe(fallback);
    expect(normalizeFullSync('invalid', fallback)).toBe(fallback);
    expect(normalizeFullSync([], fallback)).toBe(fallback);
  });

  it('does not pass invalid company or consumables values into the UI', () => {
    const result = normalizeFullSync({
      company: 'not-an-object',
      consumables: ['unexpected'],
    });

    expect(result.company).toEqual({});
    expect(result.consumables).toEqual({});
  });
});
