import { describe, it, expect } from 'vitest';
import { ownQuestionPayload, ownQuestionProblem, type OwnQuestionInput } from '../src/lib/own-question';

const mcq = (over: Partial<OwnQuestionInput> = {}): OwnQuestionInput => ({
  type: 'mcq', stem: 'How many minutes are in an hour?', options: ['30', '60', '100', ''], correctIndex: 1, answer: '', marks: 1, ...over,
});
const short = (over: Partial<OwnQuestionInput> = {}): OwnQuestionInput => ({
  type: 'short_answer', stem: 'Write 14:30 in 12-hour time.', options: [], correctIndex: null, answer: '2:30 p.m.', marks: 2, ...over,
});
const scope = { subjectId: 's1', gradeId: 'g1', curriculumNodeId: 'n1' };

describe('ownQuestionProblem', () => {
  it('accepts a multiple-choice question with a correct option, and a short answer with its expected answer', () => {
    expect(ownQuestionProblem(mcq())).toBeNull();
    expect(ownQuestionProblem(short())).toBeNull();
  });

  it('says what is missing', () => {
    expect(ownQuestionProblem(mcq({ stem: '  ' }))).toBe('Write the question.');
    expect(ownQuestionProblem(mcq({ options: ['60', '', '', ''], correctIndex: 0 }))).toBe('Give at least two options.');
    expect(ownQuestionProblem(mcq({ correctIndex: null }))).toBe('Choose the correct option.');
    expect(ownQuestionProblem(mcq({ correctIndex: 3 }))).toBe('Choose the correct option.');
    expect(ownQuestionProblem(short({ answer: ' ' }))).toBe('Write the expected answer.');
    expect(ownQuestionProblem(short({ marks: 0 }))).toBe('Marks must be a whole number from 1 to 100.');
    expect(ownQuestionProblem(short({ marks: 1.5 }))).toBe('Marks must be a whole number from 1 to 100.');
  });
});

describe('ownQuestionPayload', () => {
  it('builds a question-bank question for the homework topic, blank options dropped', () => {
    expect(ownQuestionPayload(mcq(), scope)).toEqual({
      ...scope,
      type: 'mcq',
      stem: 'How many minutes are in an hour?',
      options: [
        { label: 'A', text: '30', isCorrect: false },
        { label: 'B', text: '60', isCorrect: true },
        { label: 'C', text: '100', isCorrect: false },
      ],
      answer: '60',
      marks: 1,
      cognitiveLevel: { caps: 'routine', blooms: 'understand' },
    });
  });

  it('keeps the expected answer of a short-answer question', () => {
    expect(ownQuestionPayload(short(), scope)).toMatchObject({ type: 'short_answer', options: [], answer: '2:30 p.m.', marks: 2 });
  });
});
