/** Where an issued mark landed (returned by POST /ai-tools/markings/:id/issue). */
export interface GradebookLink {
  assessmentId: string;
  classId: string;
  subjectId: string;
  term: number;
  academicYear: number;
}

export type GradebookTab = 'overview' | 'capture' | 'weightings' | 'reports';

export interface GradebookParams {
  classId?: string;
  subjectId?: string;
  term?: string;
  assessmentId?: string;
  tab?: GradebookTab;
}

const TERMS = new Set(['1', '2', '3', '4', 'year']);
const TABS = new Set<string>(['overview', 'capture', 'weightings', 'reports']);

/** A gradebook link that opens Enter marks on exactly where a mark landed. */
export function gradebookHref(link: GradebookLink): string {
  const params = new URLSearchParams({
    classId: link.classId,
    subjectId: link.subjectId,
    term: String(link.term),
    assessmentId: link.assessmentId,
    tab: 'capture',
  });
  return `/teacher/grades?${params.toString()}`;
}

/** The gradebook state a link asks for; anything unknown or empty is dropped. */
export function readGradebookParams(params: { get(name: string): string | null }): GradebookParams {
  const result: GradebookParams = {};
  const id = (name: 'classId' | 'subjectId' | 'assessmentId') => {
    const value = params.get(name)?.trim();
    if (value) result[name] = value;
  };
  id('classId');
  id('subjectId');
  id('assessmentId');
  const term = params.get('term');
  if (term && TERMS.has(term)) result.term = term;
  const tab = params.get('tab');
  if (tab && TABS.has(tab)) result.tab = tab as GradebookTab;
  return result;
}

/**
 * Which assessment to open after a class's assessments load. A linked one wins;
 * if it isn't in the loaded page, fetch it by id rather than opening the wrong one.
 */
export function resolveLinkedAssessment(
  list: ReadonlyArray<{ id: string }>,
  wantedId: string | undefined,
): { pick: string | null; fetchWanted: boolean } {
  if (!wantedId) return { pick: list[0]?.id ?? null, fetchWanted: false };
  if (list.some((a) => a.id === wantedId)) return { pick: wantedId, fetchWanted: false };
  return { pick: null, fetchWanted: true };
}
