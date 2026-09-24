export type StuckReason =
  | { kind: 'failed_check'; itemTitle: string; count: number }
  | { kind: 'idle'; days: number };

export interface InsightLearner {
  enrolmentId: string;
  /** Opens the learner's profile. */
  studentId?: string;
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
  /** The quick check the question is on. */
  itemId: string;
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

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole calendar days between an ISO timestamp and now (0 = today), not a raw 24h-bucket count. */
export function calendarDaysAgo(iso: string, now: Date = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / (24 * 60 * 60 * 1000));
}

/**
 * Why a learner is stuck, in plain words; null when they aren't. The idle
 * day count is recomputed from `lastActivityAt` by calendar day when given,
 * so it always agrees with the "last seen" badge for the same learner
 * instead of drifting a day apart from a differently-rounded server count.
 */
export function stuckLabel(reason: StuckReason | null, lastActivityAt?: string | null, now: Date = new Date()): string | null {
  if (!reason) return null;
  if (reason.kind === 'failed_check') return `Stuck on ${reason.itemTitle} after ${reason.count} tries`;
  const days = lastActivityAt ? calendarDaysAgo(lastActivityAt, now) : reason.days;
  return `No progress for ${days} day${days === 1 ? '' : 's'}`;
}

/** When a learner last worked on the unit, by calendar day. */
export function lastSeenLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Not started';
  const days = calendarDaysAgo(iso, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/** One line on where a learner is: "Not started", "On: <item> · Yesterday", "Finished the unit · Today". */
export function learnerStatusLine(learner: InsightLearner, now: Date = new Date()): string {
  if (!learner.lastActivityAt) return 'Not started';
  const seen = lastSeenLabel(learner.lastActivityAt, now);
  if (learner.status === 'completed') return `Finished the unit · ${seen}`;
  return learner.currentItem ? `On: ${learner.currentItem.title} · ${seen}` : `Working through it · ${seen}`;
}

export interface RevisionTarget {
  itemId: string;
  itemTitle: string;
  questionIds: string[];
}

export type InsightViewState = 'error' | 'loading' | 'empty' | 'ready';

/** Which state the unit insight section should render. */
export function insightViewState(insight: UnitInsight | null, error: string | null): InsightViewState {
  if (error) return 'error';
  if (!insight) return 'loading';
  if (insight.totals.enrolled === 0) return 'empty';
  return 'ready';
}

export type MissedState = 'none-yet' | 'no-quick-checks' | 'has-missed';

/**
 * Whether "no wrong answers" means the class is getting every quick check
 * right, or there's nothing to check yet — those read very differently to a
 * teacher, so they need different copy.
 */
export function missedQuestionsState(insight: Pick<UnitInsight, 'items' | 'mostMissed'>): MissedState {
  if (insight.mostMissed.length > 0) return 'has-missed';
  return insight.items.some((i) => i.itemKind === 'quick_check') ? 'none-yet' : 'no-quick-checks';
}

/** The checks a revision item can follow, each with its missed questions. The worst check comes first. */
export function revisionTargets(missed: MissedQuestion[]): RevisionTarget[] {
  const byItem = new Map<string, RevisionTarget>();
  for (const q of missed) {
    const target = byItem.get(q.itemId) ?? { itemId: q.itemId, itemTitle: q.itemTitle, questionIds: [] };
    byItem.set(q.itemId, { ...target, questionIds: [...target.questionIds, q.questionId] });
  }
  return [...byItem.values()];
}
