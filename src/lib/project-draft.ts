import type { RubricCriterionInput } from '@/types/assignments';

/**
 * A project the teacher writes themselves (no AI draft): an empty rubric
 * whose criteria already add up to the total, and what's missing before it
 * can be saved.
 */
export function blankProjectRubric(totalMarks: number, criterionCount: number): RubricCriterionInput[] {
  const count = Math.max(1, Math.floor(criterionCount));
  const base = Math.floor(totalMarks / count);
  const extra = totalMarks - base * count;
  return Array.from({ length: count }, (_: unknown, i: number) => ({ name: '', description: '', maxMarks: base + (i < extra ? 1 : 0) }));
}

export function projectDraftProblem(d: {
  title: string;
  brief: string;
  rubric: Array<{ name: string; maxMarks: number }>;
  totalMarks: number;
}): string | null {
  if (!d.title.trim()) return 'Give the project a title.';
  // The brief comes from a rich-text editor: an empty one is still some tags.
  if (!d.brief.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()) return 'Write the brief.';
  if (d.rubric.length === 0) return 'Add at least one rubric criterion.';
  if (d.rubric.some((c: { name: string }) => !c.name.trim())) return 'Name every rubric criterion.';
  const sum = d.rubric.reduce((s: number, c: { maxMarks: number }) => s + c.maxMarks, 0);
  if (sum !== d.totalMarks) return `The criteria add up to ${sum}; make them add up to ${d.totalMarks}.`;
  return null;
}
