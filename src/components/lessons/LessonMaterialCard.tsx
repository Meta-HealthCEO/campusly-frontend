'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import type { LessonMaterial, LessonMaterialKind } from '@/types/lesson';

interface Props {
  material: LessonMaterial;
  onDelete: (mid: string) => Promise<void>;
  onOpenDrawer: (kind: LessonMaterialKind, materialId: string) => void;
}

const KIND_LABELS: Record<LessonMaterialKind, string> = {
  reading: 'Reading',
  worksheet: 'Worksheet',
  activity: 'Activity',
  notes: 'Notes',
  worked_example: 'Worked Example',
  quiz: 'Quiz',
  practice_questions: 'Practice Questions',
  homework: 'Homework',
  paper: 'Paper',
};

export function LessonMaterialCard({ material, onDelete, onOpenDrawer }: Props) {
  const sortable = useSortable({ id: material._id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const isPlaceholder = !material.generatedAt;

  return (
    <Card
      ref={sortable.setNodeRef}
      style={style}
      className="p-3 flex gap-2 items-start"
    >
      <button
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
        className="cursor-grab text-muted-foreground touch-none"
        aria-label="Drag handle"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium truncate">{material.title}</span>
          <Badge variant="outline" className="text-xs">
            {KIND_LABELS[material.kind]}
          </Badge>
          <Badge
            variant={isPlaceholder ? 'secondary' : 'default'}
            className="text-xs"
          >
            {isPlaceholder ? 'Placeholder' : 'Generated'}
          </Badge>
        </div>
        {material.teacherNotes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {material.teacherNotes}
          </p>
        )}
      </div>
      <div className="flex gap-2 text-xs shrink-0">
        <button
          type="button"
          onClick={() => onOpenDrawer(material.kind, material._id)}
          className="text-primary hover:underline"
        >
          {isPlaceholder ? 'Generate' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={() => void onDelete(material._id)}
          className="text-destructive hover:underline"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}
