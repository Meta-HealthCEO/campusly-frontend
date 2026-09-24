import { describe, it, expect } from 'vitest';
import { LANGUAGE_OPTIONS, REWRITE_OPTIONS, emptyQuestion, keptBlocksNote, questionsProblem, stepsFromBlocks, textBlocksOf } from '../src/lib/item-editing';

describe('rewrite and language options', () => {
  it('offers the rewrites and the South African languages the server accepts', () => {
    expect(REWRITE_OPTIONS.map((o) => o.action)).toEqual(['easier', 'harder', 'shorter', 'simpler_words', 'regenerate']);
    expect(LANGUAGE_OPTIONS.map((o) => o.code)).toEqual(['af', 'zu', 'xh', 'st', 'tn']);
  });
});

describe('stepsFromBlocks and textBlocksOf', () => {
  it('reads a worked example\'s steps and a note\'s text blocks', () => {
    const steps = [{ title: 'Start', content: '47' }];
    expect(stepsFromBlocks([{ blockId: 'w', type: 'step_reveal', content: JSON.stringify({ steps }) }])).toEqual(steps);
    expect(stepsFromBlocks([{ blockId: 'w', type: 'step_reveal', content: 'not json' }])).toEqual([]);
    expect(textBlocksOf([{ blockId: 'a', type: 'text', content: 'Hi' }, { blockId: 'b', type: 'image', content: 'x' }])).toEqual([{ blockId: 'a', type: 'text', content: 'Hi' }]);
  });
});

describe('questionsProblem', () => {
  it('says what to fix, the same way the server does', () => {
    const ok = { stem: 'What comes next?', options: [{ text: '40', isCorrect: true }, { text: '50', isCorrect: false }] };
    expect(questionsProblem([ok])).toBeNull();
    expect(questionsProblem([])).toBe('Add at least one question.');
    expect(questionsProblem([{ ...ok, stem: ' ' }])).toBe('Question 1 needs a question.');
    expect(questionsProblem([ok, { ...ok, options: [{ text: 'a', isCorrect: false }, { text: 'b', isCorrect: false }] }])).toBe('Question 2 needs exactly one right answer.');
    expect(questionsProblem([{ ...ok, options: [{ text: 'a', isCorrect: true }] }])).toBe('Question 1 needs at least 2 answer choices.');
    expect(questionsProblem([{ ...ok, options: [{ text: 'a', isCorrect: true }, { text: '', isCorrect: false }] }])).toBe('Question 1 has an empty answer choice.');
  });

  it('starts a new question with two choices, the first marked right', () => {
    expect(emptyQuestion()).toEqual({ stem: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] });
  });
});

describe('keptBlocksNote', () => {
  const block = (type: string) => ({ blockId: type, type, content: '' });

  it('tells the teacher what the editor leaves alone', () => {
    expect(keptBlocksNote('notes', [block('text'), block('quiz'), block('image')])).toBe("This item also has 2 parts the editor doesn't show. Saving keeps them as they are.");
    expect(keptBlocksNote('worked_example', [block('text'), block('step_reveal')])).toBe("This item also has 1 part the editor doesn't show. Saving keeps it as it is.");
  });

  it('says nothing when the editor shows everything', () => {
    expect(keptBlocksNote('notes', [block('text')])).toBeNull();
    expect(keptBlocksNote('worked_example', [block('step_reveal')])).toBeNull();
  });
});
