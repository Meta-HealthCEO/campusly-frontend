'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardGridSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { GraduationCap, Plus, Search, Sparkles } from 'lucide-react';
import { CourseCard } from '@/components/courses/CourseCard';
import { CreateCourseDialog } from '@/components/courses/CreateCourseDialog';
import { useTeacherCourses } from '@/hooks/useTeacherCourses';
import { ROUTES } from '@/lib/constants';
import type { Course, CourseStatus } from '@/types';

const STATUS_OPTIONS: Array<{ value: CourseStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default function TeacherCoursesPage() {
  const router = useRouter();
  const {
    courses,
    loading,
    filters,
    setFilters,
    createCourse,
    deleteCourse,
  } = useTeacherCourses();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);

  const handleCreated = (course: Course) => {
    router.push(ROUTES.TEACHER_COURSE_EDIT(course.id));
  };
  // Class units have their own page (outline, progress, release); other courses keep the builder.
  const openCourse = (course: Course) => {
    router.push(course.kind === 'class_unit' ? `/teacher/courses/${course.id}` : ROUTES.TEACHER_COURSE_EDIT(course.id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Units of work for your classes. The AI drafts them from CAPS; you check them and release them to your learners."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => router.push('/teacher/courses/new')} className="min-h-11 gap-1.5 sm:min-h-9">
            <Sparkles className="h-4 w-4" aria-hidden /> New unit with AI
          </Button>
          <Button variant="outline" onClick={() => setCreateOpen(true)} className="min-h-11 sm:min-h-9">
            <Plus className="mr-1 h-4 w-4" aria-hidden /> Blank course
          </Button>
        </div>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value || undefined })
            }
            placeholder="Search courses..."
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v: unknown) => {
            const next = v as CourseStatus | 'all';
            setFilters({
              ...filters,
              status: next === 'all' ? undefined : next,
            });
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No units yet"
          description="Pick a class and the CAPS topics, and the AI drafts a unit your learners can work through, week by week."
          action={
            <Button onClick={() => router.push('/teacher/courses/new')} className="gap-1.5">
              <Sparkles className="h-4 w-4" aria-hidden /> New unit with AI
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => openCourse(course)}
              onDelete={
                course.status === 'draft' || course.status === 'archived'
                  ? () => setPendingDelete(course)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <CreateCourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createCourse}
        onCreated={handleCreated}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
        title="Delete course"
        description={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.title}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (pendingDelete) await deleteCourse(pendingDelete.id);
        }}
      />
    </div>
  );
}
