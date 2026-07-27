import { describe, it, expect } from 'vitest';
import {
  normalizeMatchText,
  titleCaseCode,
  inferTerm,
  contextsMatch,
  type CurriculumGenerationContext,
} from '../src/lib/curriculum-context';
import type { CurriculumNodeItem } from '../src/types';

function node(code: string, title: string): CurriculumNodeItem {
  return { code, title } as CurriculumNodeItem;
}

describe('normalizeMatchText', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeMatchText('Natural Sciences & Tech!')).toBe('naturalsciencestech');
  });

  it('handles undefined', () => {
    expect(normalizeMatchText(undefined)).toBe('');
  });
});

describe('titleCaseCode', () => {
  it('turns kebab/snake codes into title case', () => {
    expect(titleCaseCode('natural-sciences_tech')).toBe('Natural Sciences Tech');
  });
});

describe('inferTerm', () => {
  it('reads T<number> tokens from codes', () => {
    expect(inferTerm(node('MATH-G7-T3', 'Algebra'))).toBe(3);
  });

  it('reads "Term N" from titles', () => {
    expect(inferTerm(node('X', 'Term 2 revision'))).toBe(2);
  });

  it('rejects out-of-range terms', () => {
    expect(inferTerm(node('MATH-T9', 'Nope'))).toBeNull();
  });

  it('returns null when no term marker exists', () => {
    expect(inferTerm(node('MATH-G7', 'Algebra'))).toBeNull();
  });
});

describe('contextsMatch', () => {
  const base: CurriculumGenerationContext = {
    subjectCode: 'MATH',
    subjectName: 'Mathematics',
    gradeLevel: 7,
    gradeName: 'Grade 7',
    term: 1,
  };

  it('matches identical subject/grade/term', () => {
    expect(contextsMatch(base, { ...base, subjectName: 'Renamed' })).toBe(true);
  });

  it('rejects a different term', () => {
    expect(contextsMatch(base, { ...base, term: 2 })).toBe(false);
  });

  it('rejects a different grade', () => {
    expect(contextsMatch(base, { ...base, gradeLevel: 8 })).toBe(false);
  });
});
