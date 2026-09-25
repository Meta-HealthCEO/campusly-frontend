import { describe, expect, it } from 'vitest';
import { readSource } from './support/source';

/** Every form that takes a password (spec §3). */
const PASSWORD_FORMS = [
  'src/app/register-student/page.tsx',
  'src/app/login/page.tsx',
  'src/app/signup/teacher/page.tsx',
  'src/app/signup/coach/page.tsx',
  'src/components/auth/RegisterForm.tsx',
  'src/components/auth/ResetPasswordForm.tsx',
  'src/app/auth/change-password/page.tsx',
];

describe('auth forms cannot send a password in a URL', () => {
  it.each(PASSWORD_FORMS)('%s posts, never GETs', (file) => {
    const forms = readSource(file).match(/<form\b[^>]*>/g) ?? [];
    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) expect(form).toContain('method="post"');
  });

  it.each(PASSWORD_FORMS)('%s keeps its submit button disabled until the page is interactive', (file) => {
    const src = readSource(file);
    expect(src).toContain('useHydrated()');
    const submit = src.slice(src.indexOf('type="submit"'), src.indexOf('type="submit"') + 200);
    expect(submit).toMatch(/disabled=\{!hydrated \|\|/);
  });
});
