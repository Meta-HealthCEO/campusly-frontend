import { describe, expect, it } from 'vitest';
import { classSubjects, weightingChip, weightingLines } from '../src/lib/weighting-summary';
import type { TermBuckets } from '../src/hooks/useSubjectWeightings';

const term = (n: number, buckets: Array<[TermBuckets['buckets'][number]['assessmentType'], number]>): TermBuckets => ({
  term: n,
  buckets: buckets.map(([assessmentType, weightPercentage]) => ({ assessmentType, weightPercentage })),
  isEmpty: buckets.length === 0,
});

describe('weightingLines', () => {
  it('reads each term in plain words, dropping zero weights, in a fixed order', () => {
    const lines = weightingLines([term(3, [['project', 20], ['test', 50], ['exam', 0], ['assignment', 30]])]);
    expect(lines).toHaveLength(4);
    expect(lines[2]).toEqual({ term: 3, set: true, text: 'Tests 50 · Assignments 30 · Projects 20' });
  });

  it('says Not set for a term without weightings', () => {
    const lines = weightingLines([term(1, []), term(2, [['test', 0]])]);
    expect(lines[0]).toEqual({ term: 1, set: false, text: 'Not set' });
    expect(lines[1]).toEqual({ term: 2, set: false, text: 'Not set' });
    expect(lines[3]).toEqual({ term: 4, set: false, text: 'Not set' });
  });
});

describe('weightingChip', () => {
  const setLine = { term: 3, set: true, text: 'Tests 50 · Assignments 30 · Projects 20' };
  const unsetLine = { term: 3, set: false, text: 'Not set' };

  it("flags a fetch failure distinctly, even for a term that would otherwise read as set", () => {
    expect(weightingChip(setLine, true)).toEqual({ status: 'absent', label: "Couldn't load" });
  });

  it("still flags a fetch failure when there's no line at all for the term", () => {
    expect(weightingChip(undefined, true)).toEqual({ status: 'absent', label: "Couldn't load" });
  });

  it('shows "Not set" only when the fetch actually succeeded and found nothing', () => {
    expect(weightingChip(unsetLine, false)).toEqual({ status: 'due', label: 'Not set' });
  });

  it('shows nothing once a term has real weightings', () => {
    expect(weightingChip(setLine, false)).toBeNull();
  });
});

describe('classSubjects', () => {
  const subjects = [{ id: 'eng', gradeIds: ['g1', 'gR'] }, { id: 'phys', gradeIds: ['g10'] }, { id: 'art' }];
  it("lists the subjects taught in the class's grade", () => {
    expect(classSubjects(subjects, 'g1').map((s) => s.id)).toEqual(['eng']);
  });
  it('falls back to every subject when none list the grade', () => {
    expect(classSubjects(subjects, 'g7').map((s) => s.id)).toEqual(['eng', 'phys', 'art']);
    expect(classSubjects(subjects, null).map((s) => s.id)).toEqual(['eng', 'phys', 'art']);
  });
});

describe('classSubjects with subjects as the API sends them', () => {
  it('matches populated grade entries, so a class only lists its own grade\'s subjects', () => {
    const subjects = [
      { id: 'ns', gradeIds: [{ id: 'g8', _id: 'g8', name: 'Grade 8' }] },
      { id: 'ps', gradeIds: [{ id: 'g10', _id: 'g10', name: 'Grade 10' }] },
    ];
    expect(classSubjects(subjects, 'g8').map((s) => s.id)).toEqual(['ns']);
  });
});
