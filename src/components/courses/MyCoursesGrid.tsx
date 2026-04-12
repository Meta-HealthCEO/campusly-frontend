'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, Play, CheckCircle2 } from 'lucide-react';
import type { Enrolment, Course } from '@/types';

interface MyCoursesGridProps {
  enrolments: Enrolment[];
  onOpenCourse: (courseId: string) => void;
}

function getCourse(enrolment: Enrolment): Course | null {
  if (typeof enrolment.courseId === 'object' && enrolment.courseId !== null) {
    return enrolment.courseId;
  }
  return null;
}

function getCourseId(enrolment: Enrolment): string {
  if (typeof enrolment.courseId === 'string') return enrolment.courseId;
  return enrolment.courseId.id;
}

/**
 * Grid of the student's active + completed enrolments. Each card shows
 * the course cover, title, subject, progress bar, and a Continue button
 * (or a Review button when completed).
 */
export function MyCoursesGrid({ enrolments, onOpenCourse }: MyCoursesGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {enrolments.map((enrolment) => {
        const course = getCourse(enrolment);
        const courseId = getCourseId(enrolment);
        const isCompleted = enrolment.status === 'completed';
        return (
          <Card
            key={enrolment.id}
            className="flex flex-col cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onOpenCourse(courseId)}
          >
            <CardContent className="flex flex-col gap-3 p-4">
              {course?.coverImageUrl ? (
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
                <h3 className="font-semibold truncate">
                  {course?.title ?? 'Course'}
                </h3>
                {course?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{enrolment.progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCompleted ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${enrolment.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {isCompleted ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Play className="h-3 w-3" />
                    In progress
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={isCompleted ? 'outline' : 'default'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCourse(courseId);
                  }}
                >
                  {isCompleted ? 'Review' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
