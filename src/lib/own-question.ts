import type { CreateQuestionPayload, QuestionOption } from '@/types/question-bank';

/**
 * A question the teacher writes themselves for Exercise homework — no AI
 * needed, so homework works even with no AI actions left. Saved to their own
 * question bank for the homework's topic.
 */
export type OwnQuestionType = 'mcq' | 'short_answer';

export interface OwnQuestionInput {
  type: OwnQuestionType;
  stem: string;
  /** Multiple choice: up to four; blanks are ignored. */
  options: string[];
  /** Multiple choice: which of `options` is right. */
  correctIndex: number | null;
  /** Short answer: what a right answer says. */
  answer: string;
  marks: number;
}

export const OWN_QUESTION_OPTION_COUNT = 4;
const MAX_MARKS = 100;
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function emptyOwnQuestion(type: OwnQuestionType = 'mcq'): OwnQuestionInput {
  return { type, stem: '', options: Array.from({ length: OWN_QUESTION_OPTION_COUNT }, () => ''), correctIndex: null, answer: '', marks: 1 };
}

/** What still needs doing before the question can be saved, or null. */
export function ownQuestionProblem(q: OwnQuestionInput): string | null {
  if (!q.stem.trim()) return 'Write the question.';
  if (q.type === 'mcq') {
    if (q.options.filter((o: string) => o.trim()).length < 2) return 'Give at least two options.';
    if (q.correctIndex === null || !q.options[q.correctIndex]?.trim()) return 'Choose the correct option.';
  } else if (!q.answer.trim()) {
    return 'Write the expected answer.';
  }
  if (!Number.isInteger(q.marks) || q.marks < 1 || q.marks > MAX_MARKS) return `Marks must be a whole number from 1 to ${MAX_MARKS}.`;
  return null;
}

export function ownQuestionPayload(
  q: OwnQuestionInput,
  scope: { subjectId: string; gradeId: string; curriculumNodeId: string },
): CreateQuestionPayload {
  const filled = q.options
    .map((text: string, i: number) => ({ text: text.trim(), isCorrect: i === q.correctIndex }))
    .filter((o: { text: string }) => o.text);
  const options: QuestionOption[] = q.type === 'mcq'
    ? filled.map((o: { text: string; isCorrect: boolean }, i: number) => ({ label: LABELS[i], text: o.text, isCorrect: o.isCorrect }))
    : [];
  return {
    ...scope,
    type: q.type,
    stem: q.stem.trim(),
    options,
    answer: q.type === 'mcq' ? (options.find((o: QuestionOption) => o.isCorrect)?.text ?? '') : q.answer.trim(),
    marks: q.marks,
    cognitiveLevel: { caps: 'routine', blooms: 'understand' },
  };
}
