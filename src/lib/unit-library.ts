import { resolveId } from '@/lib/api-helpers';
import type { PopulatedId } from '@/types';

/** A released unit as the school library lists it (GET /courses/library). */
export interface LibraryEntry {
  id: string;
  title: string;
  gradeId: string | null;
  gradeName: string;
  subjectName: string;
  termNumber: number | null;
  authorName: string;
  items: number;
  minutes: number;
  releasedAt: string | null;
  /** The viewer's own unit. */
  mine: boolean;
}

export interface CopyClassOption {
  id: string;
  name: string;
  gradeId: string | null;
}

export const TERMS = [1, 2, 3, 4] as const;

/** A unit is copied only to a class of its own grade. */
export function sameGradeClasses<T extends CopyClassOption>(classes: T[], gradeId: string | null): T[] {
  if (!gradeId) return [];
  return classes.filter((c) => c.gradeId === gradeId);
}

const TERM = /Term \d/;

/** The copy's title for a term: the same wording the server uses. */
export function copyTitleFor(sourceTitle: string, termNumber: number, sourceTerm: number): string {
  if (termNumber === sourceTerm) return sourceTitle;
  return TERM.test(sourceTitle) ? sourceTitle.replace(TERM, `Term ${termNumber}`) : `${sourceTitle} · Term ${termNumber}`;
}

/** "Grade 1 · Mathematics · Term 3 · 6 items · 37 min" */
export function libraryMeta(entry: LibraryEntry): string {
  return [
    entry.gradeName,
    entry.subjectName,
    entry.termNumber ? `Term ${entry.termNumber}` : '',
    `${entry.items} item${entry.items === 1 ? '' : 's'}`,
    `${entry.minutes} min`,
  ].filter(Boolean).join(' · ');
}

export function libraryByline(entry: LibraryEntry): string {
  return entry.mine ? 'Yours' : `By ${entry.authorName}`;
}

/** The unit being copied, as the copy dialog needs it. */
export interface CopySource {
  title: string;
  gradeId: string | null;
  /** Empty when the page doesn't know it. */
  gradeName: string;
  termNumber: number;
}

/** The teacher's classes (one row per class), each with its grade, for choosing where a copy goes. */
export function copyClassOptions(entries: Array<{ class: { id?: string; name: string; gradeId: unknown } }>): CopyClassOption[] {
  const seen = new Map<string, CopyClassOption>();
  for (const e of entries) {
    const id = resolveId(e.class as unknown as PopulatedId);
    if (!id || seen.has(id)) continue;
    seen.set(id, { id, name: e.class.name, gradeId: resolveId(e.class.gradeId as PopulatedId) || null });
  }
  return [...seen.values()];
}

/** The class a copy goes to: the teacher's pick while it's still offered, otherwise the first one. */
export function copyClassChoice(selected: string, options: CopyClassOption[]): string {
  return options.some((c) => c.id === selected) ? selected : options[0]?.id ?? '';
}
