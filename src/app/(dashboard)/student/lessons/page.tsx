'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonCard } from '@/components/student/LessonCard';
import { MonthFilter, currentYearMonth, getMonthBounds } from '@/components/shared/MonthFilter';
import { useStudentLessons } from '@/hooks/useStudentLessons';
import type { StudentLessonListFilters } from '@/types';

export default function StudentLessonsPage() {
  const [filters, setFilters] = useState<StudentLessonListFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const initial = useMemo(() => currentYearMonth(), []);
  const [year, setYear] = useState<string>(initial.year);
  const [month, setMonth] = useState<string>(initial.month);
  const { lessons, loading, refresh } = useStudentLessons();
  const { lessons: lessonSubjectSource, refresh: refreshLessonSubjectSource } = useStudentLessons();
  const subjectOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const lesson of lessonSubjectSource) {
      if (lesson.subjectId && lesson.subjectName) {
        byId.set(lesson.subjectId, lesson.subjectName);
      }
    }
    return Array.from(byId, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lessonSubjectSource]);

  // Filter lessons client-side by the selected year + month, comparing
  // against `scheduledDate`. The backend list is small (a student's lessons),
  // so no need to add server-side date params for this.
  const visibleLessons = useMemo(() => {
    const bounds = getMonthBounds(year, month);
    if (!bounds) return lessons;
    const from = new Date(`${bounds.dateFrom}T00:00:00`).getTime();
    const to = new Date(`${bounds.dateTo}T23:59:59.999`).getTime();
    return lessons.filter((l) => {
      const t = new Date(l.scheduledDate).getTime();
      return !Number.isNaN(t) && t >= from && t <= to;
    });
  }, [lessons, year, month]);

  const handleMonthFilterChange = (nextYear: string, nextMonth: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
  };

  useEffect(() => { void refresh(filters); }, [filters, refresh]);
  useEffect(() => { void refreshLessonSubjectSource({}); }, [refreshLessonSubjectSource]);

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      setFilters((f) => ({ ...f, search: searchInput.trim() || undefined }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons"
        description="Study materials, quizzes, and activities your teacher has shared with you."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lessons..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKey}
            className="pl-9 w-full"
          />
        </div>
        <Select
          value={filters.subjectId ?? 'all'}
          onValueChange={(v: unknown) =>
            setFilters((f) => ({
              ...f,
              subjectId: v === 'all' ? undefined : (v as string),
            }))
          }
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjectOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v: unknown) =>
            setFilters((f) => ({
              ...f,
              status: v === 'all' ? undefined : (v as StudentLessonListFilters['status']),
            }))
          }
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="taught">Taught</SelectItem>
            <SelectItem value="planned">Upcoming</SelectItem>
          </SelectContent>
        </Select>
        <MonthFilter year={year} month={month} onChange={handleMonthFilterChange} />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : visibleLessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={lessons.length === 0 ? 'No lessons yet' : 'No lessons in this period'}
          description={
            lessons.length === 0
              ? "Your teacher hasn't shared any lessons with you yet."
              : 'Try a different month or year, or pick "All months" to see the whole year.'
          }
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLessons.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      )}
    </div>
  );
}
