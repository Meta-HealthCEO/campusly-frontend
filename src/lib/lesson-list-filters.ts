// ============================================================
// Lesson list filter semantics
// ============================================================
//
// The Lessons LIST view is the teacher's whole library; the Calendar view is
// the date-scoped one. The backend applies any dateFrom/dateTo range inside
// `assignedClasses.$elemMatch` (campusly-backend Lesson/service.ts), so a
// lesson that isn't assigned to a class yet — i.e. every draft — can never
// satisfy a date filter. Defaulting the list to the current month therefore
// hid the teacher's entire library behind a filter they never set.
//
// Rule: "all months" means NO date bounds (show everything). Only an
// explicitly chosen month narrows the range.

import { getMonthBounds } from '@/components/shared/MonthFilter';
import type { LessonsFilters } from '@/hooks/useLessons';

export interface LessonDateBounds {
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Date bounds for the lesson list. Returns `{}` (no bounds) for `'all'` or
 * malformed input, so the default view lists the full library.
 */
export function lessonListBounds(year: string, month: string): LessonDateBounds {
  if (month === 'all') return {};
  return getMonthBounds(year, month) ?? {};
}

/**
 * True when the teacher has narrowed the list in any way. Used to tell
 * "you have no lessons" apart from "no lessons match these filters" —
 * pagination doesn't count as a filter.
 */
export function hasActiveLessonFilters(filters: LessonsFilters): boolean {
  return Boolean(
    filters.classId
    || filters.subjectId
    || filters.dateFrom
    || filters.dateTo
    || filters.published !== undefined
    || (filters.search && filters.search.trim().length > 0),
  );
}
