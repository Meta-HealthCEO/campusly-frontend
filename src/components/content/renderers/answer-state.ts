/**
 * Right and wrong answers in lesson blocks (Task 17, orchestrator: no tints). A marked answer is a white surface with a
 * 1.5px solid edge in the semantic colour, plus an icon and a word, so the meaning never rests on colour alone.
 */
export const ANSWER_WORD = { correct: 'Correct', incorrect: 'Not quite' } as const;

/** An option the learner picked but has not checked yet: neutral fill, foreground text; its own control shows the state. */
export const CHOSEN = 'bg-muted text-foreground';

export function answerEdge(correct: boolean): string {
  return correct ? 'border-[1.5px] border-success bg-card' : 'border-[1.5px] border-destructive bg-card';
}

export function answerTone(correct: boolean): string {
  return correct ? 'text-success' : 'text-destructive';
}
