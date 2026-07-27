import { describe, it, expect } from 'vitest';
import {
  getStudentDisplayName,
  isPortalStudent,
  normaliseStudentPayload,
} from '../src/lib/student-helpers';
import type { Student } from '../src/types';

describe('getStudentDisplayName', () => {
  it('reads names from a populated user object', () => {
    const student = {
      user: { firstName: 'Sipho', lastName: 'Dlamini' },
      admissionNumber: 'A1',
    } as unknown as Student;
    expect(getStudentDisplayName(student)).toEqual({
      first: 'Sipho',
      last: 'Dlamini',
      full: 'Sipho Dlamini',
    });
  });

  it('falls back to the admission number when nameless', () => {
    const student = { admissionNumber: 'A9' } as unknown as Student;
    expect(getStudentDisplayName(student).full).toBe('A9');
  });

  it('never returns an empty display name', () => {
    const student = {} as unknown as Student;
    expect(getStudentDisplayName(student).full).toBe('Unknown Student');
  });
});

describe('isPortalStudent', () => {
  it('is true only when a userId link exists', () => {
    expect(isPortalStudent({ userId: 'u1' } as unknown as Student)).toBe(true);
    expect(isPortalStudent({} as unknown as Student)).toBe(false);
  });
});

describe('normaliseStudentPayload', () => {
  it('trims strings and drops empties', () => {
    const out = normaliseStudentPayload({
      firstName: '  Ann ',
      lastName: '',
      homeLanguage: '   ',
    });
    expect(out).toEqual({ firstName: 'Ann' });
  });

  it('converts a yyyy-mm-dd dateOfBirth to a UTC ISO string', () => {
    const out = normaliseStudentPayload({ dateOfBirth: '2012-05-01' });
    expect(out.dateOfBirth).toBe('2012-05-01T00:00:00.000Z');
  });

  it('leaves non-date-shaped dateOfBirth strings untouched (but trimmed)', () => {
    const out = normaliseStudentPayload({ dateOfBirth: ' 01/05/2012 ' });
    expect(out.dateOfBirth).toBe('01/05/2012');
  });

  it('drops empty arrays but keeps populated ones', () => {
    const out = normaliseStudentPayload({
      additionalLanguages: [],
      guardians: ['g1'],
    });
    expect(out).toEqual({ guardians: ['g1'] });
  });

  it('keeps booleans and numbers as-is', () => {
    const out = normaliseStudentPayload({ transportRequired: false, age: 12 });
    expect(out).toEqual({ transportRequired: false, age: 12 });
  });

  it('drops null and undefined values', () => {
    const out = normaliseStudentPayload({ photoUrl: null, notes: undefined });
    expect(out).toEqual({});
  });
});
