import { describe, expect, it } from 'vitest';
import { noticeReachLine } from '../src/lib/notice-board';

describe('noticeReachLine', () => {
  it('says a class notice tells its learners and their parents', () => {
    expect(noticeReachLine('class', '1A')).toBe('Learners in 1A and their parents are notified.');
  });

  it('says the same for a grade', () => {
    expect(noticeReachLine('grade', 'Grade 1')).toBe('Learners in Grade 1 and their parents are notified.');
  });

  it("says a school-wide notice shows on everyone's board without notifying anyone", () => {
    expect(noticeReachLine('school', 'School')).toBe("It shows on everyone's notice board. No one is notified.");
  });

  it('says nothing until a board is chosen', () => {
    expect(noticeReachLine(null, '')).toBe('');
  });
});
