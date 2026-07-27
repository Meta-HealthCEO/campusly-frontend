// Helpers for the teacher gradebook page — assessment field resolution
// and term-picker scope mapping.

import type { Assessment } from '@/types';

export function getSubjectName(a: Assessment): string {
  if (a.subject?.name) return a.subject.name;
  if (typeof a.subjectId === 'object' && a.subjectId !== null) {
    return ((a.subjectId as Record<string, unknown>).name as string) ?? '';
  }
  return '';
}

export function getPaperId(a: Assessment): string | null {
  if (!a.paperId) return null;
  if (typeof a.paperId === 'string') return a.paperId;
  return a.paperId.id;
}

export const TERM_OPTIONS = [
  { value: 'year', label: 'Full year' },
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
  { value: '4', label: 'Term 4' },
];

/** Convert the term-picker string into the value the Term Summary view
 *  consumes — a number 1-4 for a specific term, or the literal 'year'
 *  for the full-year roll-up. */
export function resolveTermScope(selected: string): number | 'year' {
  if (selected === 'year') return 'year';
  const n = Number(selected);
  if (Number.isInteger(n) && n >= 1 && n <= 4) return n;
  return 1;
}
