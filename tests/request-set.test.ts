import { describe, expect, it } from 'vitest';
import { diffRequestSets, landedElsewhere, normaliseRequest, toRequestSet, withoutPolling } from '../e2e/support/request-set';

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

describe('withoutPolling (Task 16: the baseline and the live run are filtered alike)', () => {
  it('drops timer-driven keys, so a filtered key never reads as "removed"', () => {
    const polling = [/^GET \/api\/notifications/, /^GET \/api\/curriculum-structure\/nodes$/];
    const baseline = ['GET /api/a', 'GET /api/curriculum-structure/nodes', 'GET /api/notifications/unread'];
    const live = ['GET /api/a'];
    expect(withoutPolling(baseline, polling)).toEqual(['GET /api/a']);
    expect(diffRequestSets(withoutPolling(baseline, polling), withoutPolling(live, polling))).toEqual({ added: [], removed: [] });
  });

  it('keeps a real change visible', () => {
    expect(diffRequestSets(withoutPolling(['GET /api/a'], []), withoutPolling(['GET /api/b'], []))).toEqual({ added: ['GET /api/b'], removed: ['GET /api/a'] });
  });
});

describe('landedElsewhere (a redirecting page has no request set of its own)', () => {
  it('is true when the page moved on to another path', () => {
    expect(landedElsewhere('/teacher/assignments', 'http://localhost:3500/teacher/homework')).toBe(true);
  });

  it('ignores the query, the hash and a trailing slash, and detail links keep their own path', () => {
    expect(landedElsewhere('/teacher/grades', 'http://localhost:3500/teacher/grades?tab=reports#x')).toBe(false);
    expect(landedElsewhere('/teacher/', 'http://localhost:3500/teacher')).toBe(false);
    expect(landedElsewhere('/teacher/students/abc', 'http://localhost:3500/teacher/students/abc')).toBe(false);
  });
});
