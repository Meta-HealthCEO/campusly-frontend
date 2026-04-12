'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import type { Course } from '@/types';

interface CatalogGridProps {
  courses: Course[];
  enroledCourseIds: Set<string>;
}

function getSubjectName(course: Course): string {
  if (typeof course.subjectId === 'string') return '';
  return course.subjectId?.name ?? '';
}

/**
 * Grid of published courses from the school catalog. For Plan D,
 * students cannot self-enrol — self-enrolment is deferred to a future
 * plan. Cards are presentational with a "Ask your teacher" message on
 * non-enroled courses, or an "Enroled" pill on already-enroled ones.
 */
export function CatalogGrid({ courses, enroledCourseIds }: CatalogGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const isEnroled = enroledCourseIds.has(course.id);
        const subjectName = getSubjectName(course);
        return (
          <Card key={course.id} className="flex flex-col">
            <CardContent className="flex flex-col gap-3 p-4">
              {course.coverImageUrl ? (
                <div className="h-32 w-full rounded-md overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={course.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-32 w-full rounded-md bg-muted/50 flex items-center justify-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold truncate">{course.title}</h3>
                {course.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {subjectName && (
                  <Badge variant="outline" className="text-xs">{subjectName}</Badge>
                )}
                {course.gradeLevel !== null && (
                  <Badge variant="outline" className="text-xs">Grade {course.gradeLevel}</Badge>
                )}
                {isEnroled ? (
                  <Badge variant="secondary" className="ml-auto text-xs">Enroled</Badge>
                ) : (
                  <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">
                    Ask your teacher
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
