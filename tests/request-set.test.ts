import { describe, expect, it } from 'vitest';
import { diffRequestSets, normaliseRequest, toRequestSet } from '../e2e/support/request-set';

describe('normaliseRequest', () => {
  it('keeps the method and API path, and drops the host and query', () => {
    expect(normaliseRequest('get', 'http://localhost:4500/api/homework?classId=1&page=2')).toBe('GET /api/homework');
  });

  it('replaces Mongo ids and numeric segments, so two learners look the same', () => {
    expect(normaliseRequest('GET', 'http://localhost:4500/api/academic/classes/65f0c0ffee0000000000abcd/students'))
      .toBe('GET /api/academic/classes/:id/students');
    expect(normaliseRequest('GET', 'http://localhost:4500/api/papers/12')).toBe('GET /api/papers/:n');
  });

  it('ignores anything that is not an API call', () => {
    expect(normaliseRequest('GET', 'http://localhost:3500/_next/static/chunk.js')).toBeNull();
    expect(normaliseRequest('GET', 'not a url')).toBeNull();
  });
});

describe('toRequestSet', () => {
  it('dedupes repeats (polling, re-renders) and sorts', () => {
    expect(toRequestSet([
      { method: 'GET', url: 'http://localhost:4500/api/b' },
      { method: 'GET', url: 'http://localhost:4500/api/a' },
      { method: 'GET', url: 'http://localhost:4500/api/b?x=1' },
    ])).toEqual(['GET /api/a', 'GET /api/b']);
  });
});

describe('diffRequestSets', () => {
  it('reports calls a restyle added or lost', () => {
    expect(diffRequestSets(['GET /api/a', 'GET /api/b'], ['GET /api/b', 'POST /api/c']))
      .toEqual({ added: ['POST /api/c'], removed: ['GET /api/a'] });
  });

  it('is empty when nothing changed', () => {
    expect(diffRequestSets(['GET /api/a'], ['GET /api/a'])).toEqual({ added: [], removed: [] });
  });
});
