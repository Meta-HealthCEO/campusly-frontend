'use client';

import { useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseCard } from '@/components/courses/CourseCard';
import { CreateCourseDialog } from '@/components/courses/CreateCourseDialog';
import { UnitLibrary } from '@/components/courses/UnitLibrary';
import { CopyUnitDialog } from '@/components/courses/unit/CopyUnitDialog';
import { useTeacherCourses } from '@/hooks/useTeacherCourses';
import { useUnitLibrary } from '@/hooks/useUnitLibrary';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useGrades } from '@/hooks/useAcademics';
import { useAcademicLookups } from '@/hooks/useAcademicLookups';
import { copyClassOptions } from '@/lib/unit-library';
import { useCopyUnit } from '@/hooks/useCopyUnit';
import { ROUTES } from '@/lib/constants';
import { useIsStandalone } from '@/hooks/useIsStandalone';
import { lessonWords } from '@/lib/lesson-words';
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
  const isStandalone = useIsStandalone();
  const w = lessonWords(isStandalone);
  // A standalone teacher is the whole school: its library would only list their own work.
  const showLibrary = !isStandalone;
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
  const [tab, setTab] = useState<'mine' | 'library'>('mine');
  const library = useUnitLibrary(tab === 'library');
  const { grades } = useGrades();
  const { subjects } = useAcademicLookups();
  const copier = useCopyUnit();
  // The teaching load is only needed once the copy dialog is actually open.
  const { entries: classEntries, loading: classesLoading } = useTeacherClasses(copier.target !== null);
  const classes = useMemo(() => copyClassOptions(classEntries), [classEntries]);

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
        title={w.Many}
        description={
          isStandalone
            ? 'Lessons your learners work through: the AI drafts them from CAPS, you check them and release them to a class.'
            : 'Units of work for your classes. The AI drafts them from CAPS; you check them and release them to your learners.'
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => router.push('/teacher/courses/new')} className="min-h-11 gap-1.5 sm:min-h-9">
            <Sparkles className="h-4 w-4" aria-hidden /> New {w.one} with AI
          </Button>
          <Button variant="outline" onClick={() => setCreateOpen(true)} className="min-h-11 sm:min-h-9">
            <Plus className="mr-1 h-4 w-4" aria-hidden /> Blank {isStandalone ? w.one : 'course'}
          </Button>
        </div>
      </PageHeader>

      <Tabs value={tab} onValueChange={(v: unknown) => setTab(v === 'library' && showLibrary ? 'library' : 'mine')}>
        {showLibrary ? (
          <TabsList>
            <TabsTrigger value="mine">Your courses</TabsTrigger>
            <TabsTrigger value="library">School library</TabsTrigger>
          </TabsList>
        ) : null}

        <TabsContent value="library" className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Units released at your school. Copy one to your own class and change what you like.</p>
          <UnitLibrary
            entries={library.entries}
            loading={library.loading}
            loadingMore={library.loadingMore}
            hasMore={library.hasMore}
            error={library.error}
            filters={library.filters}
            grades={grades.map((g) => ({ id: g.id, name: g.name }))}
            subjects={subjects.map((s) => ({ id: s.id ?? s._id, name: s.name }))}
            onFiltersChange={library.setFilters}
            onLoadMore={library.loadMore}
            onOpen={(e) => router.push(`/teacher/courses/${e.id}`)}
            onCopy={(e) => copier.start({ courseId: e.id, title: e.title, gradeId: e.gradeId, gradeName: e.gradeName, termNumber: e.termNumber ?? 1 })}
          />
        </TabsContent>

        <TabsContent value="mine" className="space-y-6 pt-2">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value || undefined })
            }
            placeholder={`Search ${w.Many.toLowerCase()}...`}
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
          title={`No ${w.many} yet`}
          description={`Pick a class and the CAPS topics, and the AI drafts a ${w.one} your learners can work through, week by week.`}
          action={
            <Button onClick={() => router.push('/teacher/courses/new')} className="gap-1.5">
              <Sparkles className="h-4 w-4" aria-hidden /> New {w.one} with AI
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              words={w}
              isStandalone={isStandalone}
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
        </TabsContent>
      </Tabs>

      {copier.target ? (
        <CopyUnitDialog
          open
          onOpenChange={(o) => { if (!o) copier.close(); }}
          source={copier.target}
          classes={classes}
          classesLoading={classesLoading}
          copying={copier.copying}
          error={copier.error}
          onCopy={(input) => void copier.copy(input)}
        />
      ) : null}

      <CreateCourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createCourse}
        onCreated={handleCreated}
        noun={isStandalone ? w.one : 'course'}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
        title={`Delete ${isStandalone ? w.one : 'course'}`}
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
