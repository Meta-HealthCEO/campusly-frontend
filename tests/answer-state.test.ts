import { describe, expect, it } from 'vitest';
import { ANSWER_WORD, answerEdge, answerTone, CHOSEN } from '../src/components/content/renderers/answer-state';
import { findTints } from '../src/lib/design/palette-scan';
import { readSource } from './support/source';

const tokens = (s: string) => s.split(/\s+/).filter(Boolean);
const RENDERERS = ['QuizBlock', 'FillBlankBlock', 'MatchColumnsBlock', 'OrderingBlock'];

describe('right and wrong answers (Task 17: no tints)', () => {
  it('a right answer is a white surface with a 1.5px solid success edge', () => {
    expect(tokens(answerEdge(true))).toEqual(expect.arrayContaining(['border-[1.5px]', 'border-success', 'bg-card']));
  });

  it('a wrong answer is a white surface with a 1.5px solid destructive edge', () => {
    expect(tokens(answerEdge(false))).toEqual(expect.arrayContaining(['border-[1.5px]', 'border-destructive', 'bg-card']));
  });

  it('carries the meaning in words as well as colour', () => {
    expect(ANSWER_WORD).toEqual({ correct: 'Correct', incorrect: 'Not quite' });
    expect(answerTone(true)).toBe('text-success');
    expect(answerTone(false)).toBe('text-destructive');
  });

  it('a chosen, unchecked option is the neutral muted fill with foreground text', () => {
    expect(tokens(CHOSEN)).toEqual(['bg-muted', 'text-foreground']);
    expect(findTints(`${answerEdge(true)} ${answerEdge(false)} ${CHOSEN}`)).toEqual([]);
  });

  it.each(RENDERERS)('%s marks answers with the shared edge and the icon + word mark', (name) => {
    const src = readSource(`src/components/content/renderers/${name}.tsx`);
    expect(src).toMatch(/answerEdge\(/);
    expect(src).toMatch(/<AnswerMark /);
    expect(findTints(src)).toEqual([]);
  });
});
