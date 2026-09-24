export type DraftLevel = 'easier' | 'standard' | 'stretch';
// Fill-in-the-blank and true/false are auto-marked by exact match on the AI's
// answer text, which can mark every pupil wrong; they stay out until the
// generator writes exact answers. Short answers are marked by the teacher.
export type DraftQuestionType = 'mcq' | 'short_answer';

export interface DraftScope {
  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
}

export interface DraftOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface DraftQuestion {
  id: string;
  questionText: string;
  answer: string;
  marks: number;
  type: string;
  /** Multiple-choice options exactly as pupils will see them. */
  options: DraftOption[];
  /** A drawn diagram, or one that couldn't be drawn; null when there is none. */
  diagram: { svgUrl: string | null; failed: boolean } | null;
}

const LEVELS: Record<DraftLevel, { difficulty: number; caps: 'knowledge' | 'routine' | 'complex'; blooms: 'remember' | 'apply' | 'analyse' }> = {
  easier: { difficulty: 2, caps: 'knowledge', blooms: 'remember' },
  standard: { difficulty: 3, caps: 'routine', blooms: 'apply' },
  stretch: { difficulty: 4, caps: 'complex', blooms: 'analyse' },
};

export const DRAFT_TYPE_LABELS: Record<DraftQuestionType, string> = {
  mcq: 'Multiple choice',
  short_answer: 'Short answer',
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
  options?: DraftOption[];
  diagram?: { svgUrl?: string | null; renderStatus?: string } | null;
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
    options: (q.options ?? []).map((o: DraftOption) => ({ label: o.label, text: o.text, isCorrect: o.isCorrect === true })),
    diagram: q.diagram
      ? { svgUrl: q.diagram.svgUrl ?? null, failed: q.diagram.renderStatus === 'failed' }
      : null,
  };
}

export interface DraftFailure {
  message: string;
  /** Whether trying again straight away could work. */
  retryable: boolean;
  /** Whether this is a Pro feature the teacher can start a trial for. */
  upgrade: boolean;
}

const DRAFT_FALLBACK = 'The AI could not draft questions just now. Try again in a moment.';

/**
 * What to tell the teacher when drafting fails. Server errors and timeouts get
 * a plain sentence instead of "Internal server error"; a missing AI key, the
 * daily limit and the Pro gate aren't offered a retry that can't work.
 */
export function draftFailure(status: number | undefined, serverMessage: string | undefined): DraftFailure {
  if (status === 402) {
    return { message: 'Drafting with AI is part of Pro. Start a free trial to use it.', retryable: false, upgrade: true };
  }
  if (status === 503) return { message: serverMessage || DRAFT_FALLBACK, retryable: false, upgrade: false };
  if (status !== undefined && status >= 400 && status < 500 && serverMessage) {
    return { message: serverMessage, retryable: !/limit/i.test(serverMessage), upgrade: false };
  }
  return { message: DRAFT_FALLBACK, retryable: true, upgrade: false };
}

/** The drafts left after keeping: the ones that couldn't be saved. */
export function unsavedDrafts(drafts: DraftQuestion[], keptIds: string[]): DraftQuestion[] {
  const kept = new Set(keptIds);
  return drafts.filter((d: DraftQuestion) => !kept.has(d.id));
}

/** What to tell the teacher after keeping drafts. */
export function keptSummary(kept: number, failed: number): string {
  const noun = kept === 1 ? 'question' : 'questions';
  return failed === 0
    ? `Added ${kept} ${noun} to the homework.`
    : `Added ${kept} ${noun}; ${failed} couldn't be saved.`;
}
