'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, GraduationCap } from 'lucide-react';
import type { Course, CourseStatus } from '@/types';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
  onDelete?: () => void;
}

const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
  archived: 'Archived',
};

/**
 * Badge variants are mapped semantically so a future theme change only
 * needs to touch this map.
 */
function statusVariant(status: CourseStatus): 'secondary' | 'default' | 'outline' {
  if (status === 'published') return 'default';
  if (status === 'in_review') return 'secondary';
  return 'outline';
}

function getSubjectName(course: Course): string {
  if (typeof course.subjectId === 'string') return '';
  return course.subjectId?.name ?? '';
}

export function CourseCard({ course, onClick, onDelete }: CourseCardProps) {
  const subjectName = getSubjectName(course);
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
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

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{course.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {course.description || 'No description yet.'}
            </p>
          </div>
          <Badge variant={statusVariant(course.status)} className="shrink-0">
            {STATUS_LABEL[course.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subjectName && (
            <Badge variant="outline" className="text-xs">{subjectName}</Badge>
          )}
          {course.gradeLevel !== null && (
            <Badge variant="outline" className="text-xs">Grade {course.gradeLevel}</Badge>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete course"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
