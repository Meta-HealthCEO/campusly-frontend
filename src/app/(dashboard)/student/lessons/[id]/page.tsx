'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LessonMaterialCard } from '@/components/student/LessonMaterialCard';
import { AskBuddyDrawer } from '@/components/ai-tutor/AskBuddyDrawer';
import { useStudentLesson } from '@/hooks/useStudentLesson';
import { useStudentLessonExport } from '@/hooks/useStudentLessonExport';

export default function StudentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { lesson, loading } = useStudentLesson(id);
  const { download, downloading } = useStudentLessonExport();

  if (loading) return <LoadingSpinner />;

  if (!lesson) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/student/lessons')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to lessons
        </Button>
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push('/student/lessons')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to lessons
      </Button>

      <PageHeader title={lesson.title} description={lesson.subjectName}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={lesson.status === 'taught' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {lesson.status === 'taught' ? 'Taught' : 'Upcoming'}
          </Badge>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />{' '}
            {new Date(lesson.scheduledDate).toLocaleDateString()}
          </span>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {lesson.durationMinutes} min
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={downloading}
            onClick={() =>
              void download(lesson.id, `${lesson.title || 'lesson'}-student.pdf`)
            }
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {downloading ? 'Preparing…' : 'Download pack'}
          </Button>
        </div>
      </PageHeader>

      {lesson.objectives.length > 0 && (
        <section className="rounded-lg border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold mb-2">Learning objectives</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {lesson.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Materials</h3>
        {lesson.materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No materials attached yet.</p>
        ) : (
          <div className="space-y-3">
            {lesson.materials.map((m) => (
              <LessonMaterialCard key={m.id} material={m} lessonId={lesson.id} />
            ))}
          </div>
        )}
      </section>

      <div className="pt-2">
        <AskBuddyDrawer
          subjectId={lesson.subjectId}
          subjectName={lesson.subjectName}
          context={{
            surface: 'lesson',
            surfaceId: lesson.id,
            title: lesson.title,
          }}
        />
      </div>
    </div>
  );
}
