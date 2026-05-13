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
import { useStudentLessons } from '@/hooks/useStudentLessons';
import type { StudentLessonListFilters } from '@/types';

export default function StudentLessonsPage() {
  const [filters, setFilters] = useState<StudentLessonListFilters>({});
  const [searchInput, setSearchInput] = useState('');
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
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lessons yet"
          description="Your teacher hasn't shared any lessons with you yet."
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      )}
    </div>
  );
}
