/**
 * Standalone teachers get one monthly AI allowance for every AI action
 * (free: 20, Pro: up to 500). School users' AI is covered by their school.
 */

export interface AIAllowanceUsage {
  used: number;
  limit: number;
  /** ISO time the allowance resets (00:00 SAST on the 1st). */
  resetsAt: string;
  plan: 'free' | 'pro';
}

/** GET /subscriptions/ai-usage: the allowance, or { plan: 'school' } for school users. */
export type AIUsage = AIAllowanceUsage | { plan: 'school' };

export type AILimitEvent =
  | { kind: 'limit'; usage: AIAllowanceUsage }
  | { kind: 'unverified' };

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
    body: `${numbers} Pro gives you up to 500 a month for R149.`,
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

/** Whether an API error is the AI allowance (402) or unverified-email (403) refusal. */
export function aiLimitFromError(status: number | undefined, data: unknown): AILimitEvent | null {
  if (!isRecord(data)) return null;
  if (status === 403 && data.code === 'EMAIL_UNVERIFIED') return { kind: 'unverified' };
  if (status !== 402 || data.code !== 'AI_ALLOWANCE') return null;
  const usage = usageFromDetails(data.details);
  return usage ? { kind: 'limit', usage } : null;
}

/** Whether a caught request error opened the AI prompt (so the caller needn't show its own message). */
export function isAILimitError(err: unknown): boolean {
  if (!isRecord(err) || !isRecord(err.response)) return false;
  const status = typeof err.response.status === 'number' ? err.response.status : undefined;
  return aiLimitFromError(status, err.response.data) !== null;
}
