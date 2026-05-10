'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GripVertical } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { LessonMaterial, LessonMaterialKind, LessonPhase } from '@/types/lesson';

interface Props {
  material: LessonMaterial;
  phase: LessonPhase;
  onDelete: (mid: string) => Promise<void>;
  onUpdate: (
    mid: string,
    patch: { title?: string; teacherNotes?: string },
  ) => Promise<unknown>;
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

// Hints surfaced under placeholders that the bulk "Generate all" flow
// cannot safely auto-process — these need teacher-supplied references
// (textbook / existing quiz / assigned class). Generated manually.
const MANUAL_PLACEHOLDER_HINTS: Partial<Record<LessonMaterialKind, string>> = {
  reading: 'Requires a textbook — generate manually.',
  quiz: 'Requires an existing quiz — generate manually.',
  homework: 'Requires an assigned class — generate manually.',
  paper: 'Requires sections and totals — generate manually.',
};

/**
 * Resolve a "View" URL for a generated material so the teacher can actually
 * read what the AI produced. Each kind lives in its own module page.
 * Returns null when the material is a placeholder, or when the kind doesn't
 * have a viewable surface yet.
 */
function viewUrlFor(material: LessonMaterial): string | null {
  if (!material.generatedAt) return null;
  switch (material.kind) {
    case 'worksheet':
    case 'activity':
    case 'notes':
    case 'worked_example':
      return material.contentResourceId
        ? `/teacher/curriculum/preview/${material.contentResourceId}`
        : null;
    case 'practice_questions':
      return material.questionIds && material.questionIds.length > 0
        ? `/teacher/curriculum/questions?ids=${material.questionIds.join(',')}`
        : null;
    case 'homework':
      return material.homeworkId ? `/teacher/homework/${material.homeworkId}` : null;
    case 'paper':
      return material.paperId ? `/teacher/papers/${material.paperId}` : null;
    case 'quiz':
      return material.quizId ? `/teacher/learning/quizzes/${material.quizId}` : null;
    case 'reading':
      // No standalone reading viewer — the textbookRef + comprehension Q list
      // is best surfaced inline. Skip for v1; teacher still has Edit drawer.
      return null;
    default:
      return null;
  }
}

export function LessonMaterialCard({
  material,
  phase,
  onDelete,
  onUpdate,
  onOpenDrawer,
}: Props) {
  const sortable = useSortable({ id: material._id, data: { phase } });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(material.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const isPlaceholder = !material.generatedAt;

  // Re-sync the draft when the material's title changes from outside
  // (e.g. another user edited it, or the lesson refetched after a save).
  useEffect(() => {
    if (!editing) setDraftTitle(material.title);
  }, [material.title, editing]);

  // Focus the input when entering edit mode.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraftTitle(material.title);
    setEditing(true);
  };

  const commitEdit = async () => {
    const next = draftTitle.trim();
    setEditing(false);
    if (!next || next === material.title) {
      setDraftTitle(material.title);
      return;
    }
    try {
      await onUpdate(material._id, { title: next });
    } catch {
      // hook surfaces a toast; revert local draft so UI matches truth
      setDraftTitle(material.title);
    }
  };

  const cancelEdit = () => {
    setDraftTitle(material.title);
    setEditing(false);
  };

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
          {editing ? (
            <Input
              ref={inputRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={() => void commitEdit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void commitEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              className="h-7 text-sm font-medium w-full sm:w-64"
              aria-label="Material title"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="font-medium truncate text-left hover:underline focus:outline-none focus:underline"
              title="Click to rename"
            >
              {material.title}
            </button>
          )}
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
        {isPlaceholder && MANUAL_PLACEHOLDER_HINTS[material.kind] && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            {MANUAL_PLACEHOLDER_HINTS[material.kind]}
          </p>
        )}
      </div>
      <div className="flex gap-2 text-xs shrink-0">
        {(() => {
          const href = viewUrlFor(material);
          return href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              View
            </a>
          ) : null;
        })()}
        <button
          type="button"
          onClick={() => onOpenDrawer(material.kind, material._id)}
          className="text-primary hover:underline"
        >
          {isPlaceholder ? 'Generate' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="text-destructive hover:underline"
        >
          Delete
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this material?"
        description="Underlying content (questions, homework, etc.) will be soft-deleted and removed from this lesson."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => onDelete(material._id)}
      />
    </Card>
  );
}
