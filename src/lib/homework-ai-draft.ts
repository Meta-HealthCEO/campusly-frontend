export type DraftLevel = 'easier' | 'standard' | 'stretch';
export type DraftQuestionType = 'mcq' | 'short_answer' | 'true_false' | 'fill_blank';

export interface DraftScope {
  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
}

export interface DraftQuestion {
  id: string;
  questionText: string;
  answer: string;
  marks: number;
  type: string;
}

const LEVELS: Record<DraftLevel, { difficulty: number; caps: 'knowledge' | 'routine' | 'complex'; blooms: 'remember' | 'apply' | 'analyse' }> = {
  easier: { difficulty: 2, caps: 'knowledge', blooms: 'remember' },
  standard: { difficulty: 3, caps: 'routine', blooms: 'apply' },
  stretch: { difficulty: 4, caps: 'complex', blooms: 'analyse' },
};

export const DRAFT_TYPE_LABELS: Record<DraftQuestionType, string> = {
  mcq: 'Multiple choice',
  short_answer: 'Short answer',
  true_false: 'True or false',
  fill_blank: 'Fill in the blank',
};

export const DRAFT_LEVEL_LABELS: Record<DraftLevel, string> = {
  easier: 'Easier',
  standard: 'Standard',
  stretch: 'Stretch',
};

/** Why drafting isn't possible yet, or null when it is. */
export function draftBlockedReason(scope: Partial<DraftScope>): string | null {
  if (!scope.subjectId || !scope.gradeId) return 'Pick a subject and class first.';
  if (!scope.curriculumNodeId) return 'Pick a CAPS topic in step 1 to draft questions for it.';
  return null;
}

/** The body for POST /question-bank/questions/generate. */
export function draftRequest(scope: DraftScope, opts: { type: DraftQuestionType; count: number; level: DraftLevel }) {
  const level = LEVELS[opts.level];
  return {
    curriculumNodeId: scope.curriculumNodeId,
    subjectId: scope.subjectId,
    gradeId: scope.gradeId,
    type: opts.type,
    count: Math.min(10, Math.max(1, Math.round(opts.count))),
    difficulty: level.difficulty,
    cognitiveLevel: { caps: level.caps, blooms: level.blooms },
  };
}

interface RawQuestion {
  _id?: string;
  id?: string;
  stem?: string;
  answer?: string;
  marks?: number;
  type?: string;
  options?: Array<{ label: string; text: string; isCorrect: boolean }>;
}

/** A generated question as the draft list shows it: text, the answer to check, marks. */
export function toDraftQuestion(q: RawQuestion): DraftQuestion {
  const correct = q.options?.find((o) => o.isCorrect);
  return {
    id: q.id ?? q._id ?? '',
    questionText: q.stem ?? '',
    answer: q.answer?.trim() || (correct ? `${correct.label}. ${correct.text}` : ''),
    marks: q.marks ?? 1,
    type: q.type ?? '',
  };
}

/** What to tell the teacher after keeping drafts. */
export function keptSummary(kept: number, failed: number): string {
  const noun = kept === 1 ? 'question' : 'questions';
  return failed === 0
    ? `Added ${kept} ${noun} to the homework.`
    : `Added ${kept} ${noun}; ${failed} couldn't be saved.`;
}
