import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, ClipboardList, Sparkles } from 'lucide-react';
import type { StudentLessonSummary } from '@/types';

export function LessonCard({ lesson }: { lesson: StudentLessonSummary }) {
  return (
    <Link href={`/student/lessons/${lesson.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold truncate">{lesson.title}</h3>
            <Badge
              variant={lesson.status === 'taught' ? 'default' : 'secondary'}
              className="shrink-0 capitalize"
            >
              {lesson.status === 'taught' ? 'Taught' : 'Upcoming'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{lesson.subjectName || 'Subject'}</Badge>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(lesson.scheduledDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> {lesson.materialCount} materials
            </span>
            {lesson.hasHomework && (
              <span className="inline-flex items-center gap-1">
                <ClipboardList className="h-3 w-3" /> Homework
              </span>
            )}
            {lesson.hasQuiz && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Quiz
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
