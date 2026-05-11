'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LessonStatusMenu } from '@/components/lessons/outline/LessonStatusMenu';
import { LessonObjectivesEditor } from '@/components/lessons/outline/LessonObjectivesEditor';
import { LessonPhaseNav } from '@/components/lessons/outline/LessonPhaseNav';
import { LessonAssignedClasses } from '@/components/lessons/LessonAssignedClasses';
import type {
  Lesson,
  LessonPhase,
  LessonStatus,
  UpdateAssignmentPayload,
} from '@/types/lesson';

interface Props {
  lesson: Lesson;
  updateLesson: (patch: Partial<Lesson>) => Promise<Lesson>;
  patchStatus: (status: LessonStatus) => Promise<Lesson>;
  assignClass: (classId: string, scheduledDate: string) => Promise<Lesson>;
  unassignClass: (classId: string) => Promise<Lesson>;
  updateAssignment: (classId: string, patch: UpdateAssignmentPayload) => Promise<Lesson>;
  /** Opens the right-side actions drawer (Slideshow, PDFs, etc.). */
  onOpenActions: () => void;
}

function readRel<T extends { name?: string; title?: string }>(
  rel: string | T | undefined | null,
  fallback: string,
): string {
  if (!rel) return fallback;
  if (typeof rel === 'string') return fallback;
  return rel.name ?? rel.title ?? fallback;
}

/**
 * Resolve the lesson's subject/grade NAME, falling back through:
 *   1. populated academic Subject/Grade record (school-tenant flow)
 *   2. populated CurriculumNode subject/grade ancestor on the topic node
 *      (standalone teacher portal — no academic collections to populate)
 *   3. literal fallback
 */
function resolveSubjectName(lesson: Lesson): string {
  const direct = readRel(lesson.subjectId, '');
  if (direct) return direct;
  const node = lesson.curriculumNodeId;
  if (node && typeof node === 'object') {
    const inner = (node as { subjectId?: unknown }).subjectId;
    if (inner && typeof inner === 'object') {
      const o = inner as { title?: string; name?: string };
      return o.title ?? o.name ?? 'Subject';
    }
  }
  return 'Subject';
}

function resolveGradeName(lesson: Lesson): string {
  const direct = readRel(lesson.gradeId, '');
  if (direct) return direct;
  const node = lesson.curriculumNodeId;
  if (node && typeof node === 'object') {
    const inner = (node as { gradeId?: unknown }).gradeId;
    if (inner && typeof inner === 'object') {
      const o = inner as { title?: string; name?: string };
      return o.title ?? o.name ?? 'Grade';
    }
  }
  return 'Grade';
}

export function LessonHeader({
  lesson,
  updateLesson,
  patchStatus,
  assignClass,
  unassignClass,
  updateAssignment,
  onOpenActions,
}: Props) {
  const [titleDraft, setTitleDraft] = useState(lesson.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState(
    lesson.reflectionNotes ?? '',
  );

  const subjectName = resolveSubjectName(lesson);
  const gradeName = resolveGradeName(lesson);
  const topicTitle = readRel(lesson.curriculumNodeId, 'Topic');

  const phaseCounts = useMemo<Record<LessonPhase, number>>(() => {
    const base: Record<LessonPhase, number> = {
      introduction: 0,
      direct_instruction: 0,
      practice: 0,
      assessment: 0,
      homework: 0,
    };
    for (const entry of lesson.phases) base[entry.phase] = entry.materialIds.length;
    return base;
  }, [lesson.phases]);

  const saveTitle = async () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === lesson.title) {
      setTitleDraft(lesson.title);
      return;
    }
    try { await updateLesson({ title: trimmed }); }
    catch { setTitleDraft(lesson.title); }
  };

  const saveReflection = async () => {
    if (reflectionDraft === (lesson.reflectionNotes ?? '')) return;
    try { await updateLesson({ reflectionNotes: reflectionDraft }); }
    catch { setReflectionDraft(lesson.reflectionNotes ?? ''); }
  };

  const saveObjectives = async (next: string[]) => {
    await updateLesson({ objectives: next });
  };

  return (
    <header className="rounded-xl border bg-card p-6 space-y-5 shadow-sm">
      {/* Row 0 — Back link to lesson list */}
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All lessons
      </Link>

      {/* Row 1 — Title (left) + Status + Export actions (right) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {editingTitle ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setTitleDraft(lesson.title);
                  setEditingTitle(false);
                }
              }}
              className="text-2xl font-semibold h-11"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="text-2xl font-semibold tracking-tight truncate hover:bg-muted/50 rounded-md px-1.5 py-0.5 text-left min-w-0"
              title="Click to rename"
            >
              {lesson.title}
            </button>
          )}
          <LessonStatusMenu status={lesson.status} onChange={patchStatus} />
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onOpenActions}
            className="w-full sm:w-auto"
          >
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Actions
          </Button>
        </div>
      </div>

      {/* Row 2 — Grade · Subject · Term · Duration as data badges */}
      <div className="flex flex-wrap gap-2">
        <MetaChip label="Grade" value={gradeName} />
        <MetaChip label="Subject" value={subjectName} />
        {typeof lesson.termNumber === 'number' && (
          <MetaChip label="Term" value={String(lesson.termNumber)} />
        )}
        <MetaChip label="Duration" value={`${lesson.durationMinutes} min`} />
      </div>

      {/* Row 3 — Topic on its own line (full-width chip) */}
      <div className="flex flex-wrap gap-2">
        <MetaChip label="Topic" value={topicTitle} />
      </div>

      {/* Row 3b — Assigned classes (chips + add) */}
      <LessonAssignedClasses
        assignedClasses={lesson.assignedClasses}
        onAssign={assignClass}
        onUnassign={unassignClass}
        onUpdate={updateAssignment}
      />

      {/* Row 4 — Objectives (inline editable) */}
      <LessonObjectivesEditor
        initial={lesson.objectives}
        onSave={saveObjectives}
      />

      {/* Row 5 — Phase nav (horizontal scroll-to anchors) */}
      <LessonPhaseNav counts={phaseCounts} />

      {/* Optional — Reflection (only when taught) */}
      {lesson.status === 'taught' && (
        <Textarea
          value={reflectionDraft}
          onChange={(e) => setReflectionDraft(e.target.value)}
          onBlur={() => void saveReflection()}
          placeholder="Reflection: what worked? What would you change?"
          rows={3}
          className="text-sm"
        />
      )}
    </header>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 truncate bg-muted/40 px-2.5 py-1 rounded-md">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-sm font-medium truncate">{value}</span>
    </span>
  );
}
