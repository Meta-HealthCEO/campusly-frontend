'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
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
  onMoveMaterial,
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

  const handleDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id) return;
    const newIdx = materials.findIndex((m) => m._id === e.over!.id);
    if (newIdx < 0) return;
    await onMoveMaterial(String(e.active.id), phase, newIdx);
  };

  return (
    <section id={`phase-${phase}`} className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{PHASE_LABELS[phase]}</h2>
        <span className="text-xs text-muted-foreground">
          {materials.length} item{materials.length !== 1 ? 's' : ''}
        </span>
      </header>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={materials.map((m) => m._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {materials.map((m) => (
              <LessonMaterialCard
                key={m._id}
                material={m}
                onDelete={onDeleteMaterial}
                onOpenDrawer={(kind, mid) => openDrawer(phase, kind, mid)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {materials.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No materials yet — add one to get started.
        </p>
      )}
      <Button variant="outline" size="sm" onClick={() => openDrawer(phase)}>
        <Plus className="h-4 w-4 mr-1" /> Add material
      </Button>
    </section>
  );
}
