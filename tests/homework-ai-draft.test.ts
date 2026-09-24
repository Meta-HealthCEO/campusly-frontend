import { describe, expect, it } from 'vitest';
import { draftBlockedReason, draftRequest, keptSummary, toDraftQuestion, DRAFT_TYPE_LABELS, draftFailure, unsavedDrafts } from '../src/lib/homework-ai-draft';

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
      .toEqual({ id: 'q1', questionText: 'What is 2 + 3?', answer: '5', marks: 2, type: 'short_answer', options: [], diagram: null });
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

describe('review fixes', () => {
  it('only offers kinds that are marked fairly: choice (auto) and short answer (by the teacher)', () => {
    expect(Object.keys(DRAFT_TYPE_LABELS)).toEqual(['mcq', 'short_answer']);
  });

  it('shows the options pupils will see, with the right one marked, and any diagram', () => {
    const q = toDraftQuestion({
      _id: 'q1', stem: 'Which is even?', type: 'mcq', marks: 1,
      options: [{ label: 'A', text: '3', isCorrect: false }, { label: 'B', text: '4', isCorrect: true }],
      diagram: { svgUrl: '/d.svg', renderStatus: 'rendered' },
    });
    expect(q.options).toEqual([{ label: 'A', text: '3', isCorrect: false }, { label: 'B', text: '4', isCorrect: true }]);
    expect(q.diagram).toEqual({ svgUrl: '/d.svg', failed: false });
    expect(toDraftQuestion({ _id: 'q2', stem: 'x', diagram: { svgUrl: null, renderStatus: 'failed' } }).diagram).toEqual({ svgUrl: null, failed: true });
    expect(toDraftQuestion({ _id: 'q3', stem: 'x' })).toMatchObject({ options: [], diagram: null });
  });

  it('turns server failures into plain words, and only offers a retry that can work', () => {
    expect(draftFailure(402, 'Payment required')).toEqual({ message: 'Drafting with AI is part of Pro. Start a free trial to use it.', retryable: false, upgrade: true });
    expect(draftFailure(503, "AI isn't set up on this server yet.")).toEqual({ message: "AI isn't set up on this server yet.", retryable: false, upgrade: false });
    expect(draftFailure(400, 'Daily AI generation limit reached (20/20). Try again tomorrow.').retryable).toBe(false);
    expect(draftFailure(500, 'Internal server error')).toEqual({ message: 'The AI could not draft questions just now. Try again in a moment.', retryable: true, upgrade: false });
    expect(draftFailure(undefined, undefined).retryable).toBe(true);
    expect(draftFailure(400, 'Topic not found')).toEqual({ message: 'Topic not found', retryable: true, upgrade: false });
  });

  it('keeps the drafts that could not be saved, so the teacher can try adding them again', () => {
    const drafts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }].map((d) => toDraftQuestion({ _id: d.id, stem: d.id }));
    expect(unsavedDrafts(drafts, ['a', 'c']).map((d) => d.id)).toEqual(['b']);
  });
});
