export type RewriteAction = 'regenerate' | 'easier' | 'harder' | 'shorter' | 'simpler_words' | 'translate';

export const REWRITE_OPTIONS: Array<{ action: Exclude<RewriteAction, 'translate'>; label: string }> = [
  { action: 'easier', label: 'Easier' },
  { action: 'harder', label: 'Harder' },
  { action: 'shorter', label: 'Shorter' },
  { action: 'simpler_words', label: 'Simpler words' },
  { action: 'regenerate', label: 'Write it again' },
];

/** The languages the server translates into. */
export const LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'af', label: 'Afrikaans' },
  { code: 'zu', label: 'isiZulu' },
  { code: 'xh', label: 'isiXhosa' },
  { code: 'st', label: 'Sesotho' },
  { code: 'tn', label: 'Setswana' },
];

export interface EditableBlock { blockId: string; type: string; content: string }
export interface EditableStep { title: string; content: string }
export interface EditableQuestion {
  /** The saved question this came from; unchanged questions keep it, so their history stays. */
  id?: string;
  stem: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

/** A worked example's steps (from its step-reveal block). */
export function stepsFromBlocks(blocks: EditableBlock[]): EditableStep[] {
  const block = blocks.find((b) => b.type === 'step_reveal');
  if (!block) return [];
  try {
    const parsed = JSON.parse(block.content) as { steps?: EditableStep[] };
    return Array.isArray(parsed.steps) ? parsed.steps.map((s) => ({ title: s.title ?? '', content: s.content ?? '' })) : [];
  } catch {
    return [];
  }
}

/** A note's text blocks (the parts a teacher edits). */
export function textBlocksOf(blocks: EditableBlock[]): EditableBlock[] {
  return blocks.filter((b) => b.type === 'text');
}

const MAX_QUESTIONS = 8;

/** What's wrong with a quick check, worded as the server words it; null when it can be saved. */
export function questionsProblem(questions: EditableQuestion[]): string | null {
  if (questions.length === 0) return 'Add at least one question.';
  if (questions.length > MAX_QUESTIONS) return `A quick check has at most ${MAX_QUESTIONS} questions.`;
  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    if (!q.stem.trim()) return `Question ${n} needs a question.`;
    if (q.options.length < 2) return `Question ${n} needs at least 2 answer choices.`;
    if (q.options.some((o) => !o.text.trim())) return `Question ${n} has an empty answer choice.`;
    if (q.options.filter((o) => o.isCorrect).length !== 1) return `Question ${n} needs exactly one right answer.`;
  }
  return null;
}

export function emptyQuestion(): EditableQuestion {
  return { stem: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] };
}

/** What the editor leaves alone (a problem, practice, pictures), said once so the teacher knows it stays. */
export function keptBlocksNote(itemKind: 'notes' | 'worked_example', blocks: EditableBlock[]): string | null {
  const editable = itemKind === 'worked_example' ? 'step_reveal' : 'text';
  const others = blocks.filter((b) => b.type !== editable).length;
  if (others === 0) return null;
  return others === 1
    ? "This item also has 1 part the editor doesn't show. Saving keeps it as it is."
    : `This item also has ${others} parts the editor doesn't show. Saving keeps them as they are.`;
}
