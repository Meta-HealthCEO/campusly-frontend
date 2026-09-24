import { describe, expect, it } from 'vitest';
import { issuedMessage } from '../src/lib/issue-toast';

describe('issuedMessage', () => {
  it("says the mark is in the gradebook and links to where it landed", () => {
    const msg = issuedMessage({
      studentName: 'Lebo Mthembu',
      gradebook: { assessmentId: 'a1', classId: 'c1', subjectId: 's1', term: 3, academicYear: 2026 },
    });
    expect(msg.title).toBe('Mark saved to the gradebook');
    expect(msg.description).toBe("Lebo Mthembu's mark is in the gradebook.");
    expect(msg.href).toBe('/teacher/grades?classId=c1&subjectId=s1&term=3&assessmentId=a1&tab=capture');
  });

  it('falls back to a plain confirmation without a link', () => {
    expect(issuedMessage({ studentName: 'Lebo', gradebook: null })).toEqual({ title: 'Marking issued', description: undefined, href: null });
    expect(issuedMessage({})).toEqual({ title: 'Marking issued', description: undefined, href: null });
  });
});
