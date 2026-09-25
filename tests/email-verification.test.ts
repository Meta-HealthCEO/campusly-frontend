import { describe, expect, it } from 'vitest';
import { needsEmailVerification } from '../src/lib/email-verification';
import { userFromApi } from '../src/lib/user-from-api';

describe('needsEmailVerification', () => {
  it('asks an unverified standalone teacher to verify', () => {
    expect(needsEmailVerification({ role: 'teacher', isStandaloneTeacher: true, emailVerifiedAt: null })).toBe(true);
  });
  it('leaves verified teachers, school teachers and learners alone', () => {
    expect(needsEmailVerification({ role: 'teacher', isStandaloneTeacher: true, emailVerifiedAt: '2026-09-25T00:00:00Z' })).toBe(false);
    expect(needsEmailVerification({ role: 'teacher', isStandaloneTeacher: false, emailVerifiedAt: null })).toBe(false);
    expect(needsEmailVerification({ role: 'student', emailVerifiedAt: null })).toBe(false);
    expect(needsEmailVerification(null)).toBe(false);
  });
});

describe('userFromApi and email verification', () => {
  it('keeps when the email was verified, and null when it was not', () => {
    expect(userFromApi({ role: 'teacher', emailVerifiedAt: '2026-09-25T00:00:00.000Z' }).emailVerifiedAt).toBe('2026-09-25T00:00:00.000Z');
    expect(userFromApi({ role: 'teacher', emailVerifiedAt: null }).emailVerifiedAt).toBeNull();
  });
});
