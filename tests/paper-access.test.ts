import { describe, expect, it } from 'vitest';
import { canEditPaper, isPaperAuthor, paperGenerationAccess } from '../src/lib/paper-access';

const allowance = (remaining: number) => ({ paperGenerations: { limit: 3, used: 3 - remaining, remaining } });

describe('paperGenerationAccess', () => {
  it('lets Pro (or school) teachers generate with no counter', () => {
    expect(paperGenerationAccess(true, allowance(0))).toEqual({ allowed: true, freeRemaining: null, freeLimit: null });
  });

  it('lets a free teacher generate while free papers remain, and says how many', () => {
    expect(paperGenerationAccess(false, allowance(2))).toEqual({ allowed: true, freeRemaining: 2, freeLimit: 3 });
  });

  it('blocks a free teacher once the free papers are used up', () => {
    expect(paperGenerationAccess(false, allowance(0))).toEqual({ allowed: false, freeRemaining: 0, freeLimit: 3 });
  });

  it('blocks when there is no allowance information (fails closed, like before)', () => {
    expect(paperGenerationAccess(false, null)).toEqual({ allowed: false, freeRemaining: null, freeLimit: null });
  });
});

describe('canEditPaper', () => {
  const me = { id: 'u1', role: 'teacher' as const, isSchoolPrincipal: false };
  it('lets the author edit, whether createdBy is an id or populated', () => {
    expect(canEditPaper('u1', me)).toBe(true);
    expect(canEditPaper({ _id: 'u1', firstName: 'T', lastName: 'M' }, me)).toBe(true);
  });
  it('lets school admins and principals edit anyone\'s paper', () => {
    expect(canEditPaper('u2', { id: 'a1', role: 'school_admin' })).toBe(true);
    // The auth store maps school_admin to 'admin'.
    expect(canEditPaper('u2', { id: 'a1', role: 'admin' })).toBe(true);
    expect(canEditPaper('u2', { id: 'p1', role: 'teacher', isSchoolPrincipal: true })).toBe(true);
  });
  it('keeps an HOD reviewing a colleague\'s paper to reading', () => {
    expect(canEditPaper('u2', me)).toBe(false);
    expect(canEditPaper('u2', null)).toBe(false);
  });
});

describe('isPaperAuthor', () => {
  it('matches the author only, not admins', () => {
    expect(isPaperAuthor({ _id: 'u1', firstName: 'T', lastName: 'M' }, 'u1')).toBe(true);
    expect(isPaperAuthor('u2', 'u1')).toBe(false);
    expect(isPaperAuthor(null, 'u1')).toBe(false);
    expect(isPaperAuthor('u1', undefined)).toBe(false);
  });
});
