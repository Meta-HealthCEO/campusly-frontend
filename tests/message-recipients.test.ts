import { describe, it, expect } from 'vitest';
import { recipientsFromStudent } from '../src/lib/message-recipients';

describe('recipientsFromStudent', () => {
  it("finds a learner's parents in guardianIds, as the API returns them", () => {
    const student = {
      id: 's1',
      guardianIds: [
        { id: 'p1', relationship: 'mother', userId: { id: 'u1', firstName: 'Zanele', lastName: 'Mthembu' } },
        { _id: 'p2', relationship: 'father', userId: { _id: 'u2', firstName: 'Sipho', lastName: 'Mthembu' } },
      ],
    };
    expect(recipientsFromStudent(student)).toEqual([
      { id: 'u1', name: 'Zanele Mthembu (mother)', role: 'parent' },
      { id: 'u2', name: 'Sipho Mthembu (father)', role: 'parent' },
    ]);
  });

  it('still reads the older parentIds shape, and leaves out parents it cannot message', () => {
    expect(recipientsFromStudent({ parentIds: [{ userId: { id: 'u3', firstName: 'Ann', lastName: 'Dube' } }, 'p9'] }))
      .toEqual([{ id: 'u3', name: 'Ann Dube', role: 'parent' }]);
    expect(recipientsFromStudent({})).toEqual([]);
  });
});
