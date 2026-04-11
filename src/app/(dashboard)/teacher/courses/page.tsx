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
import { GraduationCap, Plus, Search } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Build and publish self-paced courses for your students"
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
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
          title="No courses yet"
          description="Create your first course to start building self-paced learning paths."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => router.push(ROUTES.TEACHER_COURSE_EDIT(course.id))}
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
