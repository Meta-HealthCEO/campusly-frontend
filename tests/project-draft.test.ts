import { describe, it, expect } from 'vitest';
import { blankProjectRubric, projectDraftProblem } from '../src/lib/project-draft';

describe('blankProjectRubric', () => {
  it('splits the marks across the criteria, adding up exactly', () => {
    const rubric = blankProjectRubric(50, 4);
    expect(rubric.map((c) => c.maxMarks)).toEqual([13, 13, 12, 12]);
    expect(rubric.every((c) => c.name === '')).toBe(true);
  });
  it('always has at least one criterion', () => {
    expect(blankProjectRubric(10, 0)).toEqual([{ name: '', description: '', maxMarks: 10 }]);
  });
});

describe('projectDraftProblem', () => {
  const ok = { title: 'Time diary', brief: 'Keep a diary for a week.', rubric: [{ name: 'Accuracy', maxMarks: 10 }], totalMarks: 10 };
  it('is ready with a title, a brief and named criteria that add up', () => {
    expect(projectDraftProblem(ok)).toBeNull();
  });
  it('says what is missing', () => {
    expect(projectDraftProblem({ ...ok, title: ' ' })).toBe('Give the project a title.');
    expect(projectDraftProblem({ ...ok, brief: '' })).toBe('Write the brief.');
    expect(projectDraftProblem({ ...ok, brief: '<p> </p>' })).toBe('Write the brief.');
    expect(projectDraftProblem({ ...ok, rubric: [] })).toBe('Add at least one rubric criterion.');
    expect(projectDraftProblem({ ...ok, rubric: [{ name: '', maxMarks: 10 }] })).toBe('Name every rubric criterion.');
    expect(projectDraftProblem({ ...ok, rubric: [{ name: 'Accuracy', maxMarks: 8 }] })).toBe('The criteria add up to 8; make them add up to 10.');
  });
});
