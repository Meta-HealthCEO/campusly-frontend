import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { LEGACY_TEACHER_REDIRECTS } from '../next.config';

describe('one teacher sign-up', () => {
  it('sends /register-teacher to /signup/teacher', () => {
    expect(LEGACY_TEACHER_REDIRECTS).toContainEqual(expect.objectContaining({ source: '/register-teacher', destination: '/signup/teacher' }));
    expect(existsSync('src/app/register-teacher/page.tsx')).toBe(false);
  });
  it('links the login page and the teachers landing page to /signup/teacher', () => {
    for (const f of ['src/app/login/page.tsx', 'src/components/teachers-landing/StartFreeLink.tsx']) {
      expect(readFileSync(f, 'utf8')).not.toContain('/register-teacher');
    }
  });
});
