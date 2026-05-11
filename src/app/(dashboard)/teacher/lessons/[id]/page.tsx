'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useLesson } from '@/hooks/useLesson';
import { useLessonExport } from '@/hooks/useLessonExport';
import { LessonHeader } from '@/components/lessons/LessonHeader';
import { LessonGenerateAllBanner } from '@/components/lessons/LessonGenerateAllBanner';
import {
  LessonPhaseSection,
  PHASE_DROPPABLE_PREFIX,
} from '@/components/lessons/LessonPhaseSection';
import { MaterialDrawer } from '@/components/lessons/drawers/MaterialDrawer';
import { LessonActionsDrawer } from '@/components/lessons/LessonActionsDrawer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LESSON_PHASES, type LessonPhase } from '@/types/lesson';

const isLessonPhase = (val: unknown): val is LessonPhase =>
  typeof val === 'string' &&
  (LESSON_PHASES as readonly string[]).includes(val);

export default function LessonWorkspacePage() {
  const params = useParams();
  const lessonId = (params?.id as string | undefined) ?? '';

  const lessonHook = useLesson(lessonId);
  const exportHook = useLessonExport();
  const [actionsOpen, setActionsOpen] = useState(false);

  if (lessonHook.loading) return <LoadingSpinner />;
  if (!lessonHook.lesson) {
    return (
      <div className="p-6 text-destructive">Lesson not found</div>
    );
  }

  const lesson = lessonHook.lesson;

  // Single workspace-level DndContext so materials can be dragged between
  // phases. Resolution rules:
  //   - active.id is the dragged material id; active.data.current.phase is
  //     the source phase (set by LessonMaterialCard's useSortable).
  //   - over.id is either another material id (drop on a card) or the
  //     phase-droppable id `phase-drop-<phase>` (drop on empty space /
  //     into a different phase).
  //   - Target phase comes from over.data.current.phase (set by either the
  //     card or the phase droppable).
  //   - Target index: if over is a card, use that card's index in the
  //     target phase's materialIds; otherwise append to end.
  const handleDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    if (e.active.id === e.over.id) return;

    const activeId = String(e.active.id);
    const overId = String(e.over.id);

    const sourcePhase = isLessonPhase(e.active.data.current?.phase)
      ? e.active.data.current.phase
      : null;
    if (!sourcePhase) return;

    let targetPhase: LessonPhase | null = null;
    let targetIndex = -1;

    if (overId.startsWith(PHASE_DROPPABLE_PREFIX)) {
      const phase = overId.slice(PHASE_DROPPABLE_PREFIX.length);
      if (!isLessonPhase(phase)) return;
      targetPhase = phase;
      const phaseEntry = lesson.phases.find((p) => p.phase === targetPhase);
      targetIndex = phaseEntry ? phaseEntry.materialIds.length : 0;
    } else {
      const overPhaseRaw = e.over.data.current?.phase;
      if (!isLessonPhase(overPhaseRaw)) return;
      targetPhase = overPhaseRaw;
      const phaseEntry = lesson.phases.find((p) => p.phase === targetPhase);
      if (!phaseEntry) return;
      const idx = phaseEntry.materialIds.indexOf(overId);
      targetIndex = idx >= 0 ? idx : phaseEntry.materialIds.length;
    }

    if (!targetPhase) return;

    // Same-phase no-op: dragged onto itself shouldn't fire (filtered above),
    // but also short-circuit when source === target and indexes resolve to
    // the current position.
    if (targetPhase === sourcePhase) {
      const phaseEntry = lesson.phases.find((p) => p.phase === sourcePhase);
      const currentIdx = phaseEntry?.materialIds.indexOf(activeId) ?? -1;
      if (currentIdx === targetIndex) return;
    }

    await lessonHook.moveMaterial(activeId, targetPhase, targetIndex);
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <LessonHeader
          lesson={lesson}
          updateLesson={lessonHook.updateLesson}
          patchStatus={lessonHook.patchStatus}
          assignClass={lessonHook.assignClass}
          unassignClass={lessonHook.unassignClass}
          updateAssignment={lessonHook.updateAssignment}
          onOpenActions={() => setActionsOpen(true)}
        />

        <LessonGenerateAllBanner
          materials={lesson.materials}
          generateAllPlaceholders={lessonHook.generateAllPlaceholders}
        />

        <main className="space-y-8">
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
          materials={lesson.materials}
          lessonHasAssignedClass={(lesson.assignedClasses?.length ?? 0) > 0}
          addMaterial={lessonHook.addMaterial}
          regenerateMaterial={lessonHook.regenerateMaterial}
        />

        <LessonActionsDrawer
          lessonId={lesson._id}
          lessonTitle={lesson.title}
          open={actionsOpen}
          onClose={() => setActionsOpen(false)}
          onExportPdf={(mode) =>
            exportHook.download(
              lesson._id,
              mode,
              `${lesson.title}-${mode}.pdf`,
            )
          }
          exportingPdf={exportHook.downloading}
          onExportSlides={() =>
            exportHook.downloadSlides(
              lesson._id,
              `${lesson.title}.pptx`,
            )
          }
          exportingSlides={exportHook.downloadingSlides}
        />
      </div>
    </DndContext>
  );
}
