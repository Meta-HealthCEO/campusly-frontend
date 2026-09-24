import { describe, expect, it } from 'vitest';
import { portalForUser } from '../src/lib/portal-scope';

describe('portalForUser', () => {
  it('puts every teacher, standalone or school, in the teacher portal', () => {
    expect(portalForUser({ role: 'teacher' })).toBe('teacher');
  });

  it.each(['admin', 'school_admin', 'parent', 'student', 'super_admin', 'coach'])('leaves %s portals untouched', (role) => {
    expect(portalForUser({ role })).toBeNull();
  });

  it('has no portal before sign-in', () => {
    expect(portalForUser(null)).toBeNull();
  });
});
