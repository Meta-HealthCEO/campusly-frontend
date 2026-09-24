import type { ChipStatus } from '@/lib/status-chip';
import type { PaperModerationState } from '@/types/papers';

export type ModerationFilter = 'all' | PaperModerationState['status'];

const CHIPS: Record<PaperModerationState['status'], { status: ChipStatus; label: string }> = {
  pending: { status: 'due', label: 'With your HOD' },
  approved: { status: 'done', label: 'Approved' },
  changes_requested: { status: 'overdue', label: 'Changes asked' },
};

/**
 * The chip for a paper's moderation state; nothing for a paper never submitted.
 * A reviewer (not the author) sees a pending paper as awaiting their review.
 */
export function moderationChip(
  m: PaperModerationState | null | undefined,
  { isAuthor = true }: { isAuthor?: boolean } = {},
): { status: ChipStatus; label: string } | null {
  if (!m) return null;
  if (m.status === 'pending' && !isAuthor) return { status: 'due', label: 'Awaiting review' };
  return CHIPS[m.status];
}

export function filterByModeration<P extends { moderation?: PaperModerationState | null }>(papers: P[], filter: ModerationFilter): P[] {
  return filter === 'all' ? papers : papers.filter((p: P) => p.moderation?.status === filter);
}

/** The papers list's ?moderation= value; anything unknown shows everything. */
export function moderationFilterFromParam(value: string | null): ModerationFilter {
  return value === 'pending' || value === 'approved' || value === 'changes_requested' ? value : 'all';
}
