import { describe, expect, it } from 'vitest';
import { joinMessage } from '../src/lib/onboarding';
import { classesPageCopy } from '../src/lib/teacher-classes';
import { readSource } from './support/source';

describe('invite links (spec §3)', () => {
  it('the join message a teacher pastes opens sign-up with the code filled in', () => {
    expect(joinMessage('K7Q2MX', 'https://campusly.co.za'))
      .toBe('Join my class on Campusly: https://campusly.co.za/register-student?code=K7Q2MX (class code K7Q2MX).');
  });

  it('My classes rows and the roster code card copy the invite link', () => {
    expect(readSource('src/components/classes/TeacherClassesTable.tsx')).toContain('aria-label="Copy invite link"');
    expect(readSource('src/components/shared/ClassroomCodeCard.tsx')).toContain('Copy invite link');
    expect(readSource('src/app/(dashboard)/teacher/classes/page.tsx')).toMatch(/onCopyInvite=\{isStandaloneTeacher \?/);
  });

  it("My classes tells a standalone teacher about the invite link", () => {
    expect(classesPageCopy(true, '').description).toMatch(/invite link/);
  });
});
