import { describe, expect, it } from 'vitest';
import { canSendChangeRequest } from '../src/lib/moderation';

describe('canSendChangeRequest', () => {
  it('needs a real note so the teacher knows what to change', () => {
    expect(canSendChangeRequest('')).toBe(false);
    expect(canSendChangeRequest('   ')).toBe(false);
    expect(canSendChangeRequest('ok')).toBe(false);
  });

  it('accepts a short, specific note', () => {
    expect(canSendChangeRequest('Q4 is above grade level')).toBe(true);
  });

  it('refuses a note longer than the server accepts', () => {
    expect(canSendChangeRequest('x'.repeat(2001))).toBe(false);
  });
});
