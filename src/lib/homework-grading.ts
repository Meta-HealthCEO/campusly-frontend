/** The AI marks a standalone learner's homework at most this many times (backend HOMEWORK_AI_REMARKS). */
export const HOMEWORK_AI_REMARKS = 3;

/** What a learner sees on an answer still waiting to be marked. */
export function pendingAnswerLabel(submission: { aiMarkCount?: number } | null | undefined): string {
  return (submission?.aiMarkCount ?? 0) >= HOMEWORK_AI_REMARKS ? 'Your teacher will mark this' : 'Marking…';
}

/** The action on a homework submission row: mark it, or change an existing mark (0 counts as a mark). */
export function markActionLabel(submission: { mark?: number | null }): 'Mark' | 'Change mark' {
  return submission.mark === undefined || submission.mark === null ? 'Mark' : 'Change mark';
}

/** Checks a mark typed by the teacher against the homework's total. */
export function validateManualMark(input: string, max: number): { value: number } | { error: string } {
  const text = input.trim();
  if (text === '') return { error: 'Enter a mark.' };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: 'Enter a number.' };
  if (value < 0) return { error: "A mark can't be negative." };
  if (value > max) return { error: `A mark can't be more than ${max}.` };
  return { value };
}
