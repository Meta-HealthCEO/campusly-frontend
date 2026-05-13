'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  GripVertical,
  ListChecks,
  NotebookPen,
  PenSquare,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { MaterialContentInline } from './MaterialContentInline';
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
  study_notes: 'Notes',
  worked_example: 'Worked Example',
  quiz: 'Quiz',
  practice_questions: 'Practice Questions',
  homework: 'Homework',
  paper: 'Paper',
};

// Icon per material kind — mirrors the type tile picker so cards in the
// workspace look consistent with the picker the teacher used to create
// them. Imported as named lucide icons (no font-awesome / inline svg).
const KIND_ICONS: Record<LessonMaterialKind, LucideIcon> = {
  reading: BookOpen,
  worksheet: ClipboardList,
  activity: Activity,
  study_notes: NotebookPen,
  worked_example: Sparkles,
  quiz: ListChecks,
  practice_questions: PenSquare,
  homework: FileText,
  paper: FileText,
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


export function LessonMaterialCard({
  material,
  phase,
  onDelete,
  onUpdate,
  onOpenDrawer,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: material._id, data: { phase } });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(material.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isPlaceholder = !material.generatedAt;

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

  const KindIcon = KIND_ICONS[material.kind];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex gap-2 items-start">
      <button
        type="button"
        {...attributes}
        {...listeners}
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
          <Badge variant="outline" className="text-xs gap-1">
            <KindIcon className="h-3 w-3" />
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
      <div className="flex gap-2 text-xs shrink-0 items-center">
        {!isPlaceholder && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-primary hover:underline font-medium flex items-center gap-1"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? 'Hide' : 'View'}
          </button>
        )}
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
      </div>
      {!isPlaceholder && (
        <MaterialContentInline material={material} enabled={expanded} />
      )}
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
