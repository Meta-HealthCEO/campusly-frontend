import { describe, expect, it } from 'vitest';
import {
  devAccountSubtitle,
  devSignInErrorMessage,
  groupDevAccounts,
  isDevSignInEnabled,
  parseDevAccounts,
} from '@/lib/dev-sign-in';
import type { DevSignInAccount } from '@/types/dev-sign-in';

const account = (overrides: Partial<DevSignInAccount>): DevSignInAccount => ({
  id: 'u1', name: 'Thandi Molefe', email: 't@school.test', role: 'teacher',
  detail: 'Teacher · Grade 1 - A', isOwn: false, ...overrides,
});

describe('isDevSignInEnabled', () => {
  it('is on only for a development build with the flag set to true', () => {
    expect(isDevSignInEnabled({ nodeEnv: 'development', flag: 'true' })).toBe(true);
  });

  it.each([
    { nodeEnv: 'production', flag: 'true' },
    { nodeEnv: 'test', flag: 'true' },
    { nodeEnv: 'development', flag: 'false' },
    { nodeEnv: 'development', flag: 'TRUE' },
    { nodeEnv: 'development', flag: undefined },
    { nodeEnv: undefined, flag: 'true' },
  ])('is off for %o', (env) => {
    expect(isDevSignInEnabled(env)).toBe(false);
  });
});

describe('parseDevAccounts', () => {
  it('keeps well-formed accounts and drops anything else', () => {
    const good = account({});
    expect(parseDevAccounts([good, { id: 'x' }, null, 'nope', { ...good, id: 7 }])).toEqual([good]);
  });

  it('returns an empty list for a body that is not a list', () => {
    expect(parseDevAccounts(undefined)).toEqual([]);
    expect(parseDevAccounts({ data: [] })).toEqual([]);
  });
});

describe('groupDevAccounts', () => {
  it('puts own accounts under "your account" and the rest under roles, in order', () => {
    const own = account({ id: 'me', isOwn: true });
    const admin = account({ id: 'a', role: 'school_admin' });
    const learner = account({ id: 'l', role: 'student' });

    expect(groupDevAccounts([admin, own, learner])).toEqual({ own: [own], roles: [admin, learner] });
  });
});

describe('devAccountSubtitle', () => {
  it('uses the detail the backend sends', () => {
    expect(devAccountSubtitle(account({}))).toBe('Teacher · Grade 1 - A');
  });

  it('falls back to a readable role when there is no detail', () => {
    expect(devAccountSubtitle(account({ role: 'school_admin', detail: '' }))).toBe('School admin');
    expect(devAccountSubtitle(account({ role: 'student', detail: ' ' }))).toBe('Learner');
  });
});

describe('devSignInErrorMessage', () => {
  it('prefers the error the backend sent', () => {
    const err = { response: { status: 403, data: { error: 'Development sign-in only answers on this computer' } } };
    expect(devSignInErrorMessage(err, 'fallback')).toBe('Development sign-in only answers on this computer');
  });

  it('explains a 404 as the backend gate being closed', () => {
    expect(devSignInErrorMessage({ response: { status: 404, data: {} } }, 'fallback')).toBe(
      'The backend has development sign-in turned off. Set DEV_SIGN_IN=true in its .env and restart it.',
    );
  });

  it('falls back to the error message, then the fallback', () => {
    expect(devSignInErrorMessage(new Error('Network Error'), 'fallback')).toBe('Network Error');
    expect(devSignInErrorMessage('weird', 'fallback')).toBe('fallback');
  });
});
