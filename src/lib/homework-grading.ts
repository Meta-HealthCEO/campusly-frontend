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
