import { describe, expect, it } from 'vitest';
import { chipFor } from '../src/lib/status-chip';

describe('chipFor', () => {
  it.each([
    ['present', 'success', 'Present'], ['marked', 'success', 'Marked'], ['published', 'success', 'Published'], ['done', 'success', 'Done'],
    ['late', 'attention', 'Late'], ['overdue', 'attention', 'Overdue'], ['due', 'attention', 'Due'], ['pending', 'attention', 'To mark'],
    ['absent', 'destructive', 'Absent'],
    ['excused', 'info', 'Excused'],
    ['draft', 'quiet', 'Draft'],
    ['ai', 'accent', 'AI draft'],
  ] as const)('%s means %s ("%s")', (status, tone, label) => {
    expect(chipFor(status)).toEqual({ tone, label });
  });
});
