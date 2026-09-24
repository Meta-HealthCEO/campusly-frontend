import { describe, expect, it } from 'vitest';
import { filterByModeration, moderationChip, moderationFilterFromParam } from '../src/lib/moderation-chip';

describe('moderationChip', () => {
  it('names each moderation state in plain words', () => {
    expect(moderationChip({ status: 'pending', comments: null, updatedAt: null })).toEqual({ status: 'due', label: 'With your HOD' });
    expect(moderationChip({ status: 'approved', comments: null, updatedAt: null })).toEqual({ status: 'done', label: 'Approved' });
    expect(moderationChip({ status: 'changes_requested', comments: 'Q3', updatedAt: null })).toEqual({ status: 'overdue', label: 'Changes asked' });
  });

  it('shows nothing for a paper never sent for moderation', () => {
    expect(moderationChip(null)).toBeNull();
    expect(moderationChip(undefined)).toBeNull();
  });
});

describe('moderation filter', () => {
  const papers = [
    { title: 'a', moderation: { status: 'pending' as const, comments: null, updatedAt: null } },
    { title: 'b', moderation: null },
    { title: 'c', moderation: { status: 'changes_requested' as const, comments: 'x', updatedAt: null } },
  ];

  it('keeps only papers in the chosen state', () => {
    expect(filterByModeration(papers, 'pending').map((p) => p.title)).toEqual(['a']);
    expect(filterByModeration(papers, 'all').map((p) => p.title)).toEqual(['a', 'b', 'c']);
  });

  it('reads the filter from a link, ignoring anything unknown', () => {
    expect(moderationFilterFromParam('changes_requested')).toBe('changes_requested');
    expect(moderationFilterFromParam('nonsense')).toBe('all');
    expect(moderationFilterFromParam(null)).toBe('all');
  });
});
