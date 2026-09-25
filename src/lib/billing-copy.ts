/** Standalone teachers' plans, as Billing describes them. Limits match the backend's ai-allowance constants. */
export const FREE_AI_ACTIONS_PER_MONTH = 20;
export const PRO_AI_ACTIONS_PER_MONTH = 500;
export const PRO_MONTHLY_PRICE = 'R149';

export type TeacherPlan = 'free' | 'pro';

/** What a plan includes, for Billing and the landing page: only what the product actually does. */
export function planFeatures(plan: TeacherPlan): string[] {
  if (plan === 'free') {
    return [
      `${FREE_AI_ACTIONS_PER_MONTH} AI actions a month: lessons, test papers, memos, homework drafts and marking`,
      'Classes, homework, register and gradebook',
    ];
  }
  return [`Up to ${PRO_AI_ACTIONS_PER_MONTH} AI actions a month`, 'Everything in Free, plus lesson progress for each class'];
}

/** "What you get" on Billing: the features, and for Pro its price. */
export function planLines(plan: TeacherPlan): string[] {
  return plan === 'free' ? planFeatures('free') : [...planFeatures('pro'), `${PRO_MONTHLY_PRICE} a month after a 14-day free trial`];
}

/**
 * When a canceled Pro plan ends: the end of the paid period, or of the free
 * trial when the teacher canceled before paying anything. Null with neither.
 */
export function proEndsAt(sub: { currentPeriodEnd?: string | null; trialEndsAt?: string | null }): string | null {
  return sub.currentPeriodEnd ?? sub.trialEndsAt ?? null;
}
