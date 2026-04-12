'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { CourseBuilderOutline } from '@/components/courses/CourseBuilderOutline';
import { CourseBuilderLessonEditor } from '@/components/courses/CourseBuilderLessonEditor';
import { CourseBuilderMetaPanel } from '@/components/courses/CourseBuilderMetaPanel';
import { ResourcePickerDialog } from '@/components/courses/ResourcePickerDialog';
import { useCourseBuilder } from '@/hooks/useCourseBuilder';
import { AlertTriangle } from 'lucide-react';

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = params.id as string;
  const builder = useCourseBuilder(courseId);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [pickerModuleId, setPickerModuleId] = useState<string | null>(null);

  if (builder.loading) return <LoadingSpinner />;
  if (!builder.course) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Course not found"
        description="This course may have been deleted or you don't have access."
      />
    );
  }

  const selectedLesson = builder.course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === selectedLessonId) ?? null;

  const readOnly = builder.course.status !== 'draft';

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] lg:flex-row">
      {/* Outline (left) */}
      <aside className="lg:w-72 lg:shrink-0 overflow-y-auto">
        <CourseBuilderOutline
          course={builder.course}
          selectedLessonId={selectedLessonId}
          onSelectLesson={setSelectedLessonId}
          onAddModule={async (title) => { await builder.addModule(title); }}
          onRenameModule={async (moduleId, title) => {
            await builder.updateModule(moduleId, { title });
          }}
          onDeleteModule={async (moduleId) => {
            await builder.deleteModule(moduleId);
            if (selectedLessonId) {
              // If the deleted module contained the selected lesson, clear selection.
              const stillExists = builder.course?.modules
                .flatMap((m) => m.lessons)
                .some((l) => l.id === selectedLessonId);
              if (!stillExists) setSelectedLessonId(null);
            }
          }}
          onReorderModules={async (orders) => { await builder.reorderModules(orders); }}
          onAddLesson={(moduleId) => setPickerModuleId(moduleId)}
          onDeleteLesson={async (lessonId) => {
            await builder.deleteLesson(lessonId);
            if (selectedLessonId === lessonId) setSelectedLessonId(null);
          }}
          onReorderLessons={async (orders) => { await builder.reorderLessons(orders); }}
          readOnly={readOnly}
        />
      </aside>

      {/* Lesson editor (center) */}
      <main className="flex-1 overflow-y-auto">
        <CourseBuilderLessonEditor
          lesson={selectedLesson}
          onUpdate={builder.updateLesson}
          readOnly={readOnly}
        />
      </main>

      {/* Metadata (right) */}
      <aside className="lg:w-80 lg:shrink-0 overflow-y-auto">
        <CourseBuilderMetaPanel
          course={builder.course}
          onUpdate={builder.updateCourse}
          onSubmitForReview={builder.submitForReview}
          isDirty={builder.isDirty}
        />
      </aside>
      <ResourcePickerDialog
        open={pickerModuleId !== null}
        onOpenChange={(v) => { if (!v) setPickerModuleId(null); }}
        moduleId={pickerModuleId}
        onPick={async (input) => {
          const created = await builder.addLesson(input);
          if (created) {
            setPickerModuleId(null);
            setSelectedLessonId(created.id);
          }
        }}
      />
    </div>
  );
}
