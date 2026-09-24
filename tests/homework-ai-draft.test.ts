import { describe, expect, it } from 'vitest';
import { draftBlockedReason, draftRequest, keptSummary, toDraftQuestion } from '../src/lib/homework-ai-draft';

const scope = { subjectId: 's1', gradeId: 'g1', curriculumNodeId: 'n1' };

describe('draftBlockedReason', () => {
  it('asks for the topic before drafting', () => {
    expect(draftBlockedReason({ subjectId: 's1', gradeId: 'g1' })).toBe('Pick a CAPS topic in step 1 to draft questions for it.');
    expect(draftBlockedReason({})).toBe('Pick a subject and class first.');
    expect(draftBlockedReason(scope)).toBeNull();
  });
});

describe('draftRequest', () => {
  it('turns plain-word levels into the generator settings', () => {
    expect(draftRequest(scope, { type: 'mcq', count: 5, level: 'easier' })).toEqual({
      curriculumNodeId: 'n1', subjectId: 's1', gradeId: 'g1', type: 'mcq', count: 5,
      difficulty: 2, cognitiveLevel: { caps: 'knowledge', blooms: 'remember' },
    });
    expect(draftRequest(scope, { type: 'short_answer', count: 5, level: 'stretch' })).toMatchObject({
      difficulty: 4, cognitiveLevel: { caps: 'complex', blooms: 'analyse' },
    });
  });

  it('keeps the count between 1 and 10', () => {
    expect(draftRequest(scope, { type: 'mcq', count: 50, level: 'standard' }).count).toBe(10);
    expect(draftRequest(scope, { type: 'mcq', count: 0, level: 'standard' }).count).toBe(1);
  });
});

describe('toDraftQuestion', () => {
  it('reads the answer from the answer field, or the correct option', () => {
    expect(toDraftQuestion({ _id: 'q1', stem: 'What is 2 + 3?', answer: '5', marks: 2, type: 'short_answer' }))
      .toEqual({ id: 'q1', questionText: 'What is 2 + 3?', answer: '5', marks: 2, type: 'short_answer' });
    expect(toDraftQuestion({ id: 'q2', stem: 'Pick the even number', answer: '', type: 'mcq',
      options: [{ label: 'A', text: '3', isCorrect: false }, { label: 'B', text: '4', isCorrect: true }] }))
      .toMatchObject({ id: 'q2', answer: 'B. 4', marks: 1 });
  });
});

describe('keptSummary', () => {
  it('says how many could not be saved', () => {
    expect(keptSummary(3, 0)).toBe('Added 3 questions to the homework.');
    expect(keptSummary(1, 2)).toBe("Added 1 question; 2 couldn't be saved.");
  });
});
