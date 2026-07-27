import { describe, it, expect } from 'vitest';
import {
  mapId,
  unwrapResponse,
  unwrapList,
  extractErrorMessage,
  resolveId,
  resolveField,
} from '../src/lib/api-helpers';

describe('mapId', () => {
  it('copies _id into id', () => {
    expect(mapId({ _id: 'abc', name: 'x' }).id).toBe('abc');
  });

  it('keeps an existing id when _id is absent', () => {
    expect(mapId({ id: 'kept' }).id).toBe('kept');
  });

  it('falls back to empty string when neither exists', () => {
    expect(mapId({}).id).toBe('');
  });
});

describe('unwrapResponse', () => {
  it('unwraps the standard { data: { data } } envelope', () => {
    expect(unwrapResponse({ data: { data: { a: 1 } } })).toEqual({ a: 1 });
  });

  it('returns data directly when no inner envelope exists', () => {
    expect(unwrapResponse({ data: { a: 1 } as never })).toEqual({ a: 1 });
  });

  it('preserves an explicitly null payload (has own data key)', () => {
    expect(unwrapResponse({ data: { data: null as never } })).toBeNull();
  });
});

describe('unwrapList', () => {
  it('returns a bare array payload', () => {
    expect(unwrapList({ data: { data: [1, 2] } })).toEqual([1, 2]);
  });

  it('finds the named key in a keyed object', () => {
    const res = { data: { data: { items: [1], total: 1 } } };
    expect(unwrapList(res, 'items')).toEqual([1]);
  });

  it('falls back to the first array-valued key', () => {
    const res = { data: { data: { total: 3, rows: ['a'] } } };
    expect(unwrapList(res)).toEqual(['a']);
  });

  it('returns an empty array for non-list payloads', () => {
    expect(unwrapList({ data: { data: { total: 0 } } })).toEqual([]);
  });
});

describe('extractErrorMessage', () => {
  it('prefers the API error field', () => {
    const err = { response: { data: { error: 'Bad input' } } };
    expect(extractErrorMessage(err)).toBe('Bad input');
  });

  it('joins message with validation details', () => {
    const err = { response: { data: { message: 'Invalid', errors: 'name required' } } };
    expect(extractErrorMessage(err)).toBe('Invalid: name required');
  });

  it('returns the fallback for unshaped errors', () => {
    expect(extractErrorMessage(new Error('boom'), 'Fallback')).toBe('Fallback');
  });
});

describe('resolveId', () => {
  it('passes strings through', () => {
    expect(resolveId('abc')).toBe('abc');
  });

  it('reads id from a populated object', () => {
    expect(resolveId({ id: 'x' })).toBe('x');
  });

  it('reads _id when id is missing', () => {
    expect(resolveId({ _id: 'y' })).toBe('y');
  });

  it('returns empty string for null/undefined', () => {
    expect(resolveId(null)).toBe('');
    expect(resolveId(undefined)).toBe('');
  });
});

describe('resolveField', () => {
  it('reads a field from an object', () => {
    expect(resolveField<string>({ name: 'Maths' }, 'name')).toBe('Maths');
  });

  it('returns undefined for primitives and null', () => {
    expect(resolveField<string>('str', 'name')).toBeUndefined();
    expect(resolveField<string>(null, 'name')).toBeUndefined();
  });
});
