import type { ChipStatus } from '@/lib/status-chip';
import type { PaperModerationState } from '@/types/papers';

export type ModerationFilter = 'all' | PaperModerationState['status'];

const CHIPS: Record<PaperModerationState['status'], { status: ChipStatus; label: string }> = {
  pending: { status: 'due', label: 'With your HOD' },
  approved: { status: 'done', label: 'Approved' },
  changes_requested: { status: 'overdue', label: 'Changes asked' },
};

/** The chip for a paper's moderation state; nothing for a paper never submitted. */
export function moderationChip(m: PaperModerationState | null | undefined): { status: ChipStatus; label: string } | null {
  return m ? CHIPS[m.status] : null;
}

export function filterByModeration<P extends { moderation?: PaperModerationState | null }>(papers: P[], filter: ModerationFilter): P[] {
  return filter === 'all' ? papers : papers.filter((p: P) => p.moderation?.status === filter);
}

/** The papers list's ?moderation= value; anything unknown shows everything. */
export function moderationFilterFromParam(value: string | null): ModerationFilter {
  return value === 'pending' || value === 'approved' || value === 'changes_requested' ? value : 'all';
}
