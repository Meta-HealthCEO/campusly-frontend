'use client';

import Link from 'next/link';
import { ExternalLink, FileText, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
  PopulatedQuizSummary,
  PopulatedReadingSummary,
} from '@/hooks/useTeacherHomeworkDetail';

export function LinkedQuizSummary({ quiz }: { quiz: PopulatedQuizSummary | null }) {
  if (!quiz) {
    return (
      <p className="text-sm text-muted-foreground">
        No quiz is linked to this homework.
      </p>
    );
  }
  return (
    <div className="rounded-md border bg-card p-3 sm:p-4 flex flex-wrap items-center gap-3">
      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{quiz.title}</p>
        <p className="text-xs text-muted-foreground">
          {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'}
          {quiz.totalPoints > 0 && (
            <> &middot; {quiz.totalPoints} {quiz.totalPoints === 1 ? 'point' : 'points'}</>
          )}
        </p>
      </div>
      <Link
        href={`/teacher/learning/quizzes/${quiz.id}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline shrink-0"
      >
        Open quiz <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function LinkedReadingSummary({
  resource,
}: {
  resource: PopulatedReadingSummary | null;
}) {
  if (!resource) {
    return (
      <p className="text-sm text-muted-foreground">
        No reading resource is linked to this homework.
      </p>
    );
  }
  return (
    <div className="rounded-md border bg-card p-3 sm:p-4 flex flex-wrap items-center gap-3">
      <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{resource.title}</p>
        {resource.type && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {resource.type.replace('_', ' ')}
          </Badge>
        )}
      </div>
      <Link
        href={`/teacher/curriculum/preview/${resource.id}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline shrink-0"
      >
        Open resource <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
