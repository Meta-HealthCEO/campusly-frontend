import { describe, expect, it } from 'vitest';
import { statusButtonLabel } from '../src/lib/attendance-labels';

describe('statusButtonLabel', () => {
  it.each([['present', 'Present'], ['absent', 'Absent'], ['late', 'Late'], ['excused', 'Excused']] as const)(
    '%s reads "%s" at every width (never an icon alone)',
    (status, word) => {
      expect(statusButtonLabel(status)).toBe(word);
    },
  );
});
