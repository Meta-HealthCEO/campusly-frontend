'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { LessonMaterialCard } from './LessonMaterialCard';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import type { Lesson, LessonMaterial, LessonPhase } from '@/types/lesson';

const PHASE_LABELS: Record<LessonPhase, string> = {
  introduction: 'Introduction',
  direct_instruction: 'Direct Instruction',
  practice: 'Practice',
  assessment: 'Assessment',
  homework: 'Homework',
};

export const PHASE_DROPPABLE_PREFIX = 'phase-drop-';

interface Props {
  phase: LessonPhase;
  lesson: Lesson;
  onUpdateMaterial: (
    mid: string,
    patch: { title?: string; teacherNotes?: string },
  ) => Promise<unknown>;
  onMoveMaterial: (
    mid: string,
    toPhase: LessonPhase,
    toIndex: number,
  ) => Promise<void>;
  onDeleteMaterial: (mid: string) => Promise<void>;
}

export function LessonPhaseSection({
  phase,
  lesson,
  onUpdateMaterial,
  onDeleteMaterial,
}: Props) {
  const openDrawer = useLessonWorkspaceStore((s) => s.openDrawer);

  const phaseEntry = lesson.phases.find((p) => p.phase === phase);

  const materials: LessonMaterial[] = useMemo(() => {
    if (!phaseEntry) return [];
    return phaseEntry.materialIds
      .map((id) => lesson.materials.find((m) => m._id === id))
      .filter((m): m is LessonMaterial => !!m);
  }, [phaseEntry, lesson.materials]);

  // Make the phase container itself a droppable so cards can be dropped
  // onto an empty phase. The id is namespaced so the orchestrator's
  // handleDragEnd can distinguish phase drops from material drops.
  const { setNodeRef, isOver } = useDroppable({
    id: `${PHASE_DROPPABLE_PREFIX}${phase}`,
    data: { phase },
  });

  return (
    <section id={`phase-${phase}`} className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{PHASE_LABELS[phase]}</h2>
        <span className="text-xs text-muted-foreground">
          {materials.length} item{materials.length !== 1 ? 's' : ''}
        </span>
      </header>
      <SortableContext
        items={materials.map((m) => m._id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`space-y-2 rounded-md transition-colors ${
            isOver ? 'bg-primary/5 ring-1 ring-primary/30' : ''
          } ${materials.length === 0 ? 'min-h-16 border border-dashed p-3' : ''}`}
        >
          {materials.map((m) => (
            <LessonMaterialCard
              key={m._id}
              material={m}
              phase={phase}
              onDelete={onDeleteMaterial}
              onUpdate={onUpdateMaterial}
              onOpenDrawer={(kind, mid) => openDrawer(phase, kind, mid)}
            />
          ))}
          {materials.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No materials yet — add one or drag here.
            </p>
          )}
        </div>
      </SortableContext>
      <Button variant="outline" size="sm" onClick={() => openDrawer(phase)}>
        <Plus className="h-4 w-4 mr-1" /> Add material
      </Button>
    </section>
  );
}
