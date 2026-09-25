import { describe, expect, it } from 'vitest';
import { canEditPaper, isPaperAuthor } from '../src/lib/paper-access';

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
