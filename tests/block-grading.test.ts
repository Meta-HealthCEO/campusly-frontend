import { describe, it, expect } from 'vitest';
import { gradeBlockLocally } from '../src/lib/block-grading';

describe('gradeBlockLocally — quiz', () => {
  const mcq = JSON.stringify({
    type: 'mcq',
    question: 'Pick B',
    options: [
      { label: 'A', text: 'no', isCorrect: false },
      { label: 'B', text: 'yes', isCorrect: true },
    ],
  });

  it('marks the correct MCQ label as correct with full points', () => {
    expect(gradeBlockLocally('quiz', mcq, 'B', 2)).toEqual({
      correct: true,
      score: 2,
      maxScore: 2,
    });
  });

  it('marks a wrong MCQ label as incorrect with zero score', () => {
    expect(gradeBlockLocally('quiz', mcq, 'A', 2)).toEqual({
      correct: false,
      score: 0,
      maxScore: 2,
    });
  });

  it('compares MCQ labels case-insensitively', () => {
    expect(gradeBlockLocally('quiz', mcq, 'b', 1).correct).toBe(true);
  });

  it('grades legacy seed format via correctIndex', () => {
    const legacy = JSON.stringify({
      question: 'Pick the second',
      options: ['wrong', 'right'],
      correctIndex: 1,
    });
    expect(gradeBlockLocally('quiz', legacy, 'B', 1).correct).toBe(true);
    expect(gradeBlockLocally('quiz', legacy, 'A', 1).correct).toBe(false);
  });

  it('grades true/false against correctAnswer', () => {
    const tf = JSON.stringify({ type: 'true_false', correctAnswer: 'True' });
    expect(gradeBlockLocally('quiz', tf, 'true', 1).correct).toBe(true);
    expect(gradeBlockLocally('quiz', tf, 'False', 1).correct).toBe(false);
  });

  it('grades short answers by normalised exact match', () => {
    const sa = JSON.stringify({ type: 'short_answer', correctAnswer: 'Photosynthesis' });
    expect(gradeBlockLocally('quiz', sa, '  photosynthesis ', 1).correct).toBe(true);
  });

  it('returns incorrect for malformed quiz JSON without throwing', () => {
    expect(gradeBlockLocally('quiz', '{not json', 'B', 3)).toEqual({
      correct: false,
      score: 0,
      maxScore: 3,
    });
  });
});

describe('gradeBlockLocally — fill_blank', () => {
  const content = JSON.stringify({
    blanks: ['mitochondria', 'cell'],
    acceptAlternatives: [['mitochondrion'], []],
  });

  it('accepts exact blanks as a JSON array response', () => {
    const res = gradeBlockLocally('fill_blank', content, JSON.stringify(['mitochondria', 'cell']), 2);
    expect(res.correct).toBe(true);
    expect(res.score).toBe(2);
  });

  it('accepts listed alternatives', () => {
    const res = gradeBlockLocally('fill_blank', content, JSON.stringify(['mitochondrion', 'cell']), 1);
    expect(res.correct).toBe(true);
  });

  it('accepts comma-separated fallback responses', () => {
    expect(gradeBlockLocally('fill_blank', content, 'mitochondria, cell', 1).correct).toBe(true);
  });

  it('rejects a wrong blank', () => {
    expect(gradeBlockLocally('fill_blank', content, JSON.stringify(['ribosome', 'cell']), 1).correct).toBe(false);
  });
});

describe('gradeBlockLocally — match_columns / drag_drop / ordering', () => {
  it('accepts matching pairs in any order', () => {
    const content = JSON.stringify({ correctPairs: [[0, 1], [1, 0]] });
    const response = JSON.stringify([[1, 0], [0, 1]]);
    expect(gradeBlockLocally('match_columns', content, response, 1).correct).toBe(true);
  });

  it('rejects a wrong pairing', () => {
    const content = JSON.stringify({ correctPairs: [[0, 0], [1, 1]] });
    const response = JSON.stringify([[0, 1], [1, 0]]);
    expect(gradeBlockLocally('match_columns', content, response, 1).correct).toBe(false);
  });

  it('grades drag_drop with the match_columns rules', () => {
    const content = JSON.stringify({ correctPairs: [[0, 0]] });
    expect(gradeBlockLocally('drag_drop', content, JSON.stringify([[0, 0]]), 1).correct).toBe(true);
  });

  it('requires exact sequence for ordering', () => {
    const content = JSON.stringify({ correctOrder: [2, 0, 1] });
    expect(gradeBlockLocally('ordering', content, JSON.stringify([2, 0, 1]), 1).correct).toBe(true);
    expect(gradeBlockLocally('ordering', content, JSON.stringify([0, 1, 2]), 1).correct).toBe(false);
  });
});

describe('gradeBlockLocally — non-graded types', () => {
  it('treats informational blocks as complete with full points', () => {
    for (const type of ['text', 'image', 'video', 'step_reveal']) {
      expect(gradeBlockLocally(type, 'anything', '', 1)).toEqual({
        correct: true,
        score: 1,
        maxScore: 1,
      });
    }
  });

  it('records but does not judge hotspot and code responses', () => {
    for (const type of ['hotspot', 'code']) {
      expect(gradeBlockLocally(type, '{}', 'x', 1)).toEqual({
        correct: null,
        score: 0,
        maxScore: 1,
      });
    }
  });

  it('defaults missing points to 1', () => {
    expect(gradeBlockLocally('text', '', '', 0).maxScore).toBe(1);
  });
});
