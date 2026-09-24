import { describe, expect, it } from 'vitest';
import { gradebookHref, readGradebookParams, resolveLinkedAssessment } from '../src/lib/gradebook-link';

const link = { assessmentId: 'a1', classId: 'c1', subjectId: 's1', term: 3, academicYear: 2026 };

describe('gradebookHref', () => {
  it('opens Enter marks on the class, subject, term and assessment', () => {
    const href = gradebookHref(link);
    expect(href.startsWith('/teacher/grades?')).toBe(true);
    expect(readGradebookParams(new URLSearchParams(href.split('?')[1]))).toEqual({
      classId: 'c1', subjectId: 's1', term: '3', assessmentId: 'a1', tab: 'capture',
    });
  });
});

describe('readGradebookParams', () => {
  it('keeps only terms 1 to 4 or the full year', () => {
    expect(readGradebookParams(new URLSearchParams('term=year')).term).toBe('year');
    expect(readGradebookParams(new URLSearchParams('term=5')).term).toBeUndefined();
    expect(readGradebookParams(new URLSearchParams('term=abc')).term).toBeUndefined();
  });

  it('keeps only the two tabs', () => {
    expect(readGradebookParams(new URLSearchParams('tab=overview')).tab).toBe('overview');
    expect(readGradebookParams(new URLSearchParams('tab=admin')).tab).toBeUndefined();
  });

  it('treats empty ids as missing', () => {
    expect(readGradebookParams(new URLSearchParams('classId=&subjectId='))).toEqual({});
  });
});

describe('resolveLinkedAssessment', () => {
  const list = [{ id: 'newest' }, { id: 'older' }];

  it('opens the linked assessment when it is in the list', () => {
    expect(resolveLinkedAssessment(list, 'older')).toEqual({ pick: 'older', fetchWanted: false });
  });

  it('asks for the linked assessment by id when it is not in the first page, instead of guessing', () => {
    expect(resolveLinkedAssessment(list, 'from-last-month')).toEqual({ pick: null, fetchWanted: true });
  });

  it('opens the newest assessment when nothing is linked', () => {
    expect(resolveLinkedAssessment(list, undefined)).toEqual({ pick: 'newest', fetchWanted: false });
    expect(resolveLinkedAssessment([], undefined)).toEqual({ pick: null, fetchWanted: false });
  });
});

describe('gradebook tabs', () => {
  it('opens the weightings and reports tabs from a link', () => {
    expect(readGradebookParams(new URLSearchParams('tab=weightings')).tab).toBe('weightings');
    expect(readGradebookParams(new URLSearchParams('tab=reports')).tab).toBe('reports');
    expect(readGradebookParams(new URLSearchParams('tab=admin')).tab).toBeUndefined();
  });
});
