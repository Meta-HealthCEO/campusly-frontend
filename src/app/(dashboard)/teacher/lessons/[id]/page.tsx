'use client';

import { useParams } from 'next/navigation';
import { useLesson } from '@/hooks/useLesson';
import { useLessonExport } from '@/hooks/useLessonExport';
import { LessonOutline } from '@/components/lessons/LessonOutline';
import { LessonPhaseSection } from '@/components/lessons/LessonPhaseSection';
import { MaterialDrawer } from '@/components/lessons/drawers/MaterialDrawer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LESSON_PHASES } from '@/types/lesson';

export default function LessonWorkspacePage() {
  const params = useParams();
  const lessonId = (params?.id as string | undefined) ?? '';

  const lessonHook = useLesson(lessonId);
  const exportHook = useLessonExport();

  if (lessonHook.loading) return <LoadingSpinner />;
  if (!lessonHook.lesson) {
    return (
      <div className="p-6 text-destructive">Lesson not found</div>
    );
  }

  const lesson = lessonHook.lesson;

  return (
    <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-[320px_1fr]">
      <aside className="self-start lg:sticky lg:top-4">
        <LessonOutline
          lesson={lesson}
          updateLesson={lessonHook.updateLesson}
          patchStatus={lessonHook.patchStatus}
          onExport={(mode) =>
            exportHook.download(
              lesson._id,
              mode,
              `${lesson.title}-${mode}.pdf`,
            )
          }
          exporting={exportHook.downloading}
        />
      </aside>

      <main className="space-y-6">
        {LESSON_PHASES.map((phase) => (
          <LessonPhaseSection
            key={phase}
            phase={phase}
            lesson={lesson}
            onUpdateMaterial={lessonHook.updateMaterial}
            onMoveMaterial={lessonHook.moveMaterial}
            onDeleteMaterial={lessonHook.deleteMaterial}
          />
        ))}
      </main>

      <MaterialDrawer
        lessonId={lessonId}
        addMaterial={lessonHook.addMaterial}
        regenerateMaterial={lessonHook.regenerateMaterial}
      />
    </div>
  );
}
