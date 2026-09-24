export type StuckReason =
  | { kind: 'failed_check'; itemTitle: string; count: number }
  | { kind: 'idle'; days: number };

export interface InsightLearner {
  enrolmentId: string;
  name: string;
  progressPercent: number;
  status: 'active' | 'completed' | 'dropped';
  currentItem: { id: string; title: string } | null;
  lastActivityAt: string | null;
  stuck: StuckReason | null;
}

export interface MissedQuestion {
  questionId: string;
  stem: string;
  itemTitle: string;
  answered: number;
  wrong: number;
  wrongPercent: number;
}

export interface UnitInsight {
  items: Array<{ id: string; title: string; itemKind: string | null; reached: number; completed: number }>;
  learners: InsightLearner[];
  mostMissed: MissedQuestion[];
  totals: { enrolled: number; completed: number; stuck: number };
}

/** Why a learner is stuck, in plain words; null when they aren't. */
export function stuckLabel(reason: StuckReason | null): string | null {
  if (!reason) return null;
  return reason.kind === 'failed_check'
    ? `Stuck on ${reason.itemTitle} after ${reason.count} tries`
    : `No progress for ${reason.days} days`;
}

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** When a learner last worked on the unit, by calendar day. */
export function lastSeenLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Not started';
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
