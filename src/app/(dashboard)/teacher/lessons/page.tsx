'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useLessons } from '@/hooks/useLessons';
import { useAcademicLookups } from '@/hooks/useAcademicLookups';
import { LessonListFilters } from '@/components/lessons/LessonListFilters';
import { LessonListTable } from '@/components/lessons/LessonListTable';
import { LessonCalendar } from '@/components/lessons/LessonCalendar';
import { CalendarRange, BookOpen, Plus } from 'lucide-react';

type LessonsView = 'list' | 'calendar';

export default function LessonsPage() {
  const { items, loading, filters, setFilters, deleteLesson } = useLessons();
  const { classes, subjects } = useAcademicLookups();
  const [view, setView] = useState<LessonsView>('list');

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
            <EmptyState
              icon={BookOpen}
              title="No lessons yet"
              description="Create your first lesson to get started."
            />
          ) : (
            <LessonListTable items={items} onDelete={deleteLesson} />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          {loading ? <LoadingSpinner /> : <LessonCalendar items={items} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
