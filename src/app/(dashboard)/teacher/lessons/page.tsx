'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useLessons } from '@/hooks/useLessons';
import { useAcademicLookups } from '@/hooks/useAcademicLookups';
import { useAllCurriculumSubjects } from '@/hooks/useAllCurriculumSubjects';
import { LessonListFilters } from '@/components/lessons/LessonListFilters';
import { LessonListTable } from '@/components/lessons/LessonListTable';
import { LessonCalendar } from '@/components/lessons/LessonCalendar';
import { lessonListBounds, hasActiveLessonFilters } from '@/lib/lesson-list-filters';
import { CalendarRange, BookOpen, Plus } from 'lucide-react';

type LessonsView = 'list' | 'calendar';

export default function LessonsPage() {
  const searchParams = useSearchParams();
  const routeDateFrom = searchParams.get('dateFrom') ?? undefined;
  const routeDateTo = searchParams.get('dateTo') ?? undefined;
  const hasRouteDates = Boolean(routeDateFrom || routeDateTo);

  // Default to the WHOLE library (no month filter). Defaulting to the current
  // month used to hide every lesson that isn't assigned to a class on a date
  // in that month — including all drafts — because the backend nests the date
  // range inside assignedClasses.$elemMatch. See lib/lesson-list-filters.ts.
  const initialYearMonth = useMemo(
    () => ({ year: String(new Date().getFullYear()), month: 'all' }),
    [],
  );
  const [year, setYear] = useState<string>(initialYearMonth.year);
  const [month, setMonth] = useState<string>(initialYearMonth.month);

  const initialDateFilters = useMemo(() => {
    if (hasRouteDates) return { dateFrom: routeDateFrom, dateTo: routeDateTo };
    return lessonListBounds(initialYearMonth.year, initialYearMonth.month);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { items, loading, filters, setFilters, deleteLesson, cloneLesson } =
    useLessons(initialDateFilters);
  const { classes, subjects: academicSubjects } = useAcademicLookups();
  const { subjects: capsSubjects } = useAllCurriculumSubjects();
  const [view, setView] = useState<LessonsView>('list');

  // If the URL gets explicit dates after mount, sync them in and clear the month UI.
  useEffect(() => {
    if (!hasRouteDates) return;
    setMonth('all');
    setFilters((current) => ({
      ...current,
      dateFrom: routeDateFrom,
      dateTo: routeDateTo,
      page: 1,
    }));
  }, [hasRouteDates, routeDateFrom, routeDateTo, setFilters]);

  const handleMonthFilterChange = (nextYear: string, nextMonth: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
    const bounds = lessonListBounds(nextYear, nextMonth);
    // Spread undefined explicitly so clearing a month removes the old bounds
    // instead of leaving the previous month's range in place.
    setFilters((current) => ({
      ...current,
      dateFrom: bounds.dateFrom,
      dateTo: bounds.dateTo,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setYear(String(new Date().getFullYear()));
    setMonth('all');
    setFilters((current) => ({
      page: 1,
      limit: current.limit,
    }));
  };

  const filtersActive = hasActiveLessonFilters(filters);

  // Merge academic + CAPS subjects, deduped by lowercase name. The backend
  // filter accepts either ID flavour (academic Subject _id OR CurriculumNode
  // subject _id) per the resolveSubjectOrGradeIds fallback chain, so either
  // option in this list works correctly when selected.
  const subjects = (() => {
    const seen = new Set<string>();
    const merged: Array<{ _id: string; name: string }> = [];
    for (const s of academicSubjects) {
      const key = s.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ _id: s._id, name: s.name });
    }
    for (const s of capsSubjects) {
      const key = s.title.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ _id: s.id, name: s.title });
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons"
        description="Plan, build, and export your lessons in one place."
      >
        <Link href="/teacher/lessons/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Lesson
          </Button>
        </Link>
      </PageHeader>

      <LessonListFilters
        filters={filters}
        onChange={setFilters}
        classes={classes}
        subjects={subjects}
        year={year}
        month={month}
        onMonthFilterChange={handleMonthFilterChange}
      />

      <Tabs
        value={view}
        onValueChange={(v: unknown) => setView(v as LessonsView)}
      >
        <TabsList>
          <TabsTrigger value="list">
            <BookOpen className="h-4 w-4 mr-1" /> List
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarRange className="h-4 w-4 mr-1" /> Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {loading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={BookOpen}
                title="No lessons match these filters"
                description="You may have lessons outside this date range, class, or subject."
                action={
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No lessons yet"
                description="Create your first lesson to get started."
              />
            )
          ) : (
            <LessonListTable items={items} onDelete={deleteLesson} onClone={cloneLesson} />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          {loading ? <LoadingSpinner /> : <LessonCalendar items={items} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
