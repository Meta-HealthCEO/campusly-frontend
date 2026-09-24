import { describe, expect, it } from 'vitest';
import { learnerName } from '../src/lib/conference';

describe('learnerName', () => {
  it("reads the learner's name from their user", () => {
    expect(learnerName({ id: 's1', userId: { firstName: 'Lebo', lastName: 'Mthembu' } })).toBe('Lebo Mthembu');
  });

  it('reads names put on the learner directly', () => {
    expect(learnerName({ id: 's1', firstName: 'Jan', lastName: 'Botha' })).toBe('Jan Botha');
  });

  it('says "Learner" when no name came back', () => {
    expect(learnerName({ id: 's1', userId: null })).toBe('Learner');
    expect(learnerName(null)).toBe('Learner');
  });
});
