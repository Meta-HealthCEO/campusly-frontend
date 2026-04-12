'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardGridSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MyCoursesGrid } from '@/components/courses/MyCoursesGrid';
import { CatalogGrid } from '@/components/courses/CatalogGrid';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { ROUTES } from '@/lib/constants';
import { GraduationCap } from 'lucide-react';
import type { Enrolment } from '@/types';

function getCourseIdFromEnrolment(enrolment: Enrolment): string {
  return typeof enrolment.courseId === 'string' ? enrolment.courseId : enrolment.courseId.id;
}

export default function StudentCoursesPage() {
  const router = useRouter();
  const { catalog, myEnrolments, loading } = useStudentCourses();

  const enroledCourseIds = useMemo(() => {
    return new Set(myEnrolments.map(getCourseIdFromEnrolment));
  }, [myEnrolments]);

  const handleOpenCourse = (courseId: string) => {
    router.push(ROUTES.STUDENT_COURSE_HOME(courseId));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Work through self-paced courses assigned by your teachers"
      />

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Courses ({myEnrolments.length})</TabsTrigger>
          <TabsTrigger value="catalog">Catalog ({catalog.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          {loading ? (
            <CardGridSkeleton count={6} />
          ) : myEnrolments.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No courses yet"
              description="When a teacher assigns a course to your class, it will appear here."
            />
          ) : (
            <MyCoursesGrid
              enrolments={myEnrolments}
              onOpenCourse={handleOpenCourse}
            />
          )}
        </TabsContent>

        <TabsContent value="catalog" className="mt-4">
          {loading ? (
            <CardGridSkeleton count={6} />
          ) : catalog.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No published courses"
              description="Your school hasn't published any courses yet."
            />
          ) : (
            <CatalogGrid
              courses={catalog}
              enroledCourseIds={enroledCourseIds}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
