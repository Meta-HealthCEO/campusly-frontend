/**
 * Standalone teachers get one monthly AI allowance for every AI action
 * (free: 20, Pro: up to 500). School users' AI is covered by their school.
 */
import { PRO_AI_ACTIONS_PER_MONTH, PRO_MONTHLY_PRICE } from '@/lib/billing-copy';

export interface AIAllowanceUsage {
  used: number;
  limit: number;
  /** ISO time the allowance resets (00:00 SAST on the 1st). */
  resetsAt: string;
  plan: 'free' | 'pro';
  /** The teacher's learners' tutor pool this month (standalone teachers). */
  learners?: { used: number; limit: number };
}

/** A standalone teacher's learner has used their tutor messages, or their class has (spec §5). */
export interface LearnerLimit { used: number; limit: number; resetsAt: string; scope: 'learner' | 'class' }

/** GET /subscriptions/ai-usage: the allowance, or { plan: 'school' } for school users. */
export type AIUsage = AIAllowanceUsage | { plan: 'school' };

export type AILimitEvent =
  | { kind: 'limit'; usage: AIAllowanceUsage }
  | { kind: 'unverified' }
  | { kind: 'learner-limit'; limit: LearnerLimit };

/** Warn free teachers when fewer than this many AI actions are left. */
const WARN_BELOW = 5;
/** South Africa is UTC+2 all year. */
const SAST_OFFSET_MS = 2 * 3600_000;
const DAY_MS = 24 * 3600_000;

function isAllowance(u: AIUsage | null | undefined): u is AIAllowanceUsage {
  return !!u && u.plan !== 'school';
}

/** AI actions left this month, or null when the school covers AI (or usage isn't known). */
export function aiActionsLeft(u: AIUsage | null | undefined): number | null {
  if (!isAllowance(u)) return null;
  return Math.max(0, u.limit - u.used);
}

/** "12 of 20 AI actions left this month". */
export function usageLine(u: { used: number; limit: number }): string {
  const left = Math.max(0, u.limit - u.used);
  return left === 0 ? 'No AI actions left this month' : `${left} of ${u.limit} AI actions left this month`;
}

/** Whether to show the allowance next to AI buttons: a free teacher with fewer than 5 left. */
export function shouldWarn(u: AIUsage | null | undefined): boolean {
  if (!isAllowance(u) || u.plan !== 'free') return false;
  return u.limit - u.used < WARN_BELOW;
}

/** The SAST calendar day of a moment, as days since the epoch. */
function sastDay(ms: number): number {
  return Math.floor((ms + SAST_OFFSET_MS) / DAY_MS);
}

/** "Resets on 1 October" (or "Resets tomorrow" on the last day of the month). */
export function resetLabel(resetsAt: string, now: Date): string {
  const reset = new Date(resetsAt).getTime();
  if (sastDay(reset) - sastDay(now.getTime()) === 1) return 'Resets tomorrow';
  const date = new Date(reset + SAST_OFFSET_MS).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `Resets on ${date}`;
}

/** What the upgrade prompt (and the "used up" page state) says when no AI actions are left. */
export function aiLimitCopy(usage: AIAllowanceUsage, now: Date): { title: string; body: string } {
  const numbers = `${usageLine(usage)}. ${resetLabel(usage.resetsAt, now)}.`;
  if (usage.plan === 'pro') return { title: "You've used this month's AI actions", body: numbers };
  return {
    title: "You've used this month's free AI actions",
    body: `${numbers} Pro gives you up to ${PRO_AI_ACTIONS_PER_MONTH} a month for ${PRO_MONTHLY_PRICE}.`,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function usageFromDetails(details: unknown): AIAllowanceUsage | null {
  if (!isRecord(details)) return null;
  const { used, limit, resetsAt, plan } = details;
  if (typeof used !== 'number' || typeof limit !== 'number' || typeof resetsAt !== 'string') return null;
  return { used, limit, resetsAt, plan: plan === 'pro' ? 'pro' : 'free' };
}

function learnerLimitFromDetails(details: unknown): LearnerLimit | null {
  if (!isRecord(details)) return null;
  const { used, limit, resetsAt, scope } = details;
  if (typeof used !== 'number' || typeof limit !== 'number' || typeof resetsAt !== 'string') return null;
  if (scope !== 'learner' && scope !== 'class') return null;
  return { used, limit, resetsAt, scope };
}

/** Whether an API error is the AI allowance (402), the learner tutor limit (402) or unverified email (403). */
export function aiLimitFromError(status: number | undefined, data: unknown): AILimitEvent | null {
  if (!isRecord(data)) return null;
  if (status === 403 && data.code === 'EMAIL_UNVERIFIED') return { kind: 'unverified' };
  if (status !== 402) return null;
  if (data.code === 'LEARNER_AI_LIMIT') {
    const limit = learnerLimitFromDetails(data.details);
    return limit ? { kind: 'learner-limit', limit } : null;
  }
  if (data.code !== 'AI_ALLOWANCE') return null;
  const usage = usageFromDetails(data.details);
  return usage ? { kind: 'limit', usage } : null;
}

/** Whether a caught request error opened the AI prompt (so the caller needn't show its own message). */
export function isAILimitError(err: unknown): boolean {
  if (!isRecord(err) || !isRecord(err.response)) return false;
  const status = typeof err.response.status === 'number' ? err.response.status : undefined;
  return aiLimitFromError(status, err.response.data) !== null;
}

// ─── Learners (standalone classrooms) ───────────────────────────────────────

/** GET /ai-tutor/usage for a standalone teacher's learner. */
export interface LearnerTutorUsage {
  used: number;
  limit: number;
  pool: { used: number; limit: number };
  resetsAt: string;
  plan: 'free' | 'pro';
}

/** What the learner can still send: the smaller of their own cap and the class pool. */
export function tutorMessagesLeft(u: LearnerTutorUsage): number {
  return Math.max(0, Math.min(u.limit - u.used, u.pool.limit - u.pool.used));
}

/** "5 tutor messages left this month". */
export function tutorMessagesLine(u: LearnerTutorUsage): string {
  const left = tutorMessagesLeft(u);
  if (left === 0) return 'No tutor messages left this month';
  return `${left} tutor message${left === 1 ? '' : 's'} left this month`;
}

/** The learner's dialog: no upgrade — a learner can't pay (spec §5). */
export function learnerLimitCopy(limit: LearnerLimit, now: Date): { title: string; body: string } {
  const title = limit.scope === 'learner'
    ? `You've used your ${limit.limit} tutor messages this month`
    : "Your class has used this month's tutor messages";
  return { title, body: `${resetLabel(limit.resetsAt, now)}. Your teacher can still help you in class.` };
}

/** The teacher's Billing line. */
export function learnerPoolLine(p: { used: number; limit: number }): string {
  return `Learners' tutor messages: ${p.used} of ${p.limit} used`;
}
