import { describe, expect, it } from 'vitest';
import { codeFromSearch, inviteLink } from '../src/lib/join-code';

describe('codeFromSearch (Review Focus 2)', () => {
  it('upper-cases and strips what a pasted link or a typed code may carry', () => {
    expect(codeFromSearch('ab12cd')).toBe('AB12CD');
    expect(codeFromSearch(' a b 1 2 c d ')).toBe('AB12CD');
    expect(codeFromSearch('AB12CD9')).toBe('AB12CD');
  });

  it('is empty without a code', () => {
    expect(codeFromSearch(null)).toBe('');
    expect(codeFromSearch('!!')).toBe('');
  });
});

describe('inviteLink', () => {
  it('opens sign-up with the code filled in', () => {
    expect(inviteLink('https://app.campusly.co.za', 'AB12CD')).toBe('https://app.campusly.co.za/register-student?code=AB12CD');
  });
});
