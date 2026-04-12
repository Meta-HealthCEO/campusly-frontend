'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Calendar, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Course } from '@/types';

interface ReviewQueueItemProps {
  course: Course;
  onClick: () => void;
}

function getAuthorName(course: Course): string {
  const createdBy = course.createdBy;
  if (typeof createdBy === 'string') return 'Unknown';
  return `${createdBy.firstName ?? ''} ${createdBy.lastName ?? ''}`.trim() || 'Unknown';
}

function getSubjectName(course: Course): string {
  if (typeof course.subjectId === 'string') return '';
  return course.subjectId?.name ?? '';
}

export function ReviewQueueItem({ course, onClick }: ReviewQueueItemProps) {
  const authorName = getAuthorName(course);
  const subjectName = getSubjectName(course);
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{course.title}</h3>
              <Badge variant="secondary" className="shrink-0">In Review</Badge>
            </div>
            {course.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {course.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {authorName}
              </div>
              {subjectName && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {subjectName}
                </div>
              )}
              {course.gradeLevel !== null && (
                <Badge variant="outline" className="text-[10px]">Grade {course.gradeLevel}</Badge>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Submitted {formatDate(course.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
