'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonResourceContent } from '@/components/student/LessonResourceContent';
import { useStudentLesson } from '@/hooks/useStudentLesson';

const KIND_LABEL: Record<string, string> = {
  reading: 'Reading',
  study_notes: 'Notes',
  worked_example: 'Worked example',
  worksheet: 'Worksheet',
  activity: 'Activity',
};

export default function StudentLessonMaterialPage({
  params,
}: {
  params: Promise<{ id: string; materialId: string }>;
}) {
  const { id: lessonId, materialId } = use(params);
  const router = useRouter();
  const { lesson, loading } = useStudentLesson(lessonId);

  if (loading) return <LoadingSpinner />;

  if (!lesson) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/student/lessons')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to lessons
        </Button>
        <EmptyState
          icon={BookOpen}
          title="Lesson not found"
          description="This lesson is no longer available."
        />
      </div>
    );
  }

  const material = lesson.materials.find((m) => m.id === materialId);

  if (!material) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/student/lessons/${lessonId}`)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to lesson
        </Button>
        <EmptyState
          icon={BookOpen}
          title="Material not found"
          description="This material was removed or is no longer part of the lesson."
        />
      </div>
    );
  }

  const label = KIND_LABEL[material.kind] ?? material.kind;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/student/lessons/${lessonId}`)}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to {lesson.title}
      </Button>

      <PageHeader title={material.title} description={lesson.subjectName}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{label}</Badge>
          {material.phase && (
            <span className="text-xs text-muted-foreground">{material.phase}</span>
          )}
        </div>
      </PageHeader>

      <LessonResourceContent material={material} />
    </div>
  );
}
