'use client';

import { useMemo, useState } from 'react';
import { Loader2, FileText, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LessonStatusMenu } from '@/components/lessons/outline/LessonStatusMenu';
import { LessonObjectivesEditor } from '@/components/lessons/outline/LessonObjectivesEditor';
import { LessonPhaseNav } from '@/components/lessons/outline/LessonPhaseNav';
import { LessonAssignedClasses } from '@/components/lessons/LessonAssignedClasses';
import type { Lesson, LessonPhase, LessonStatus, UpdateAssignmentPayload } from '@/types/lesson';

interface Props {
  lesson: Lesson;
  updateLesson: (patch: Partial<Lesson>) => Promise<Lesson>;
  patchStatus: (status: LessonStatus) => Promise<Lesson>;
  onExport: (mode: 'teacher' | 'student') => Promise<void> | void;
  exporting: 'teacher' | 'student' | null;
  assignClass: (classId: string, scheduledDate: string) => Promise<Lesson>;
  unassignClass: (classId: string) => Promise<Lesson>;
  updateAssignment: (classId: string, patch: UpdateAssignmentPayload) => Promise<Lesson>;
}

function readRel<T extends { name?: string; title?: string }>(
  rel: string | T | undefined | null,
  fallback: string,
): string {
  if (!rel) return fallback;
  if (typeof rel === 'string') return fallback;
  return rel.name ?? rel.title ?? fallback;
}

export function LessonOutline({
  lesson,
  updateLesson,
  patchStatus,
  onExport,
  exporting,
  assignClass,
  unassignClass,
  updateAssignment,
}: Props) {
  const [titleDraft, setTitleDraft] = useState(lesson.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState(
    lesson.reflectionNotes ?? '',
  );

  const subjectName = readRel(lesson.subjectId, 'Subject');
  const topicTitle = readRel(lesson.curriculumNodeId, 'Topic');

  const phaseCounts = useMemo<Record<LessonPhase, number>>(() => {
    const base: Record<LessonPhase, number> = {
      introduction: 0,
      direct_instruction: 0,
      practice: 0,
      assessment: 0,
      homework: 0,
    };
    for (const entry of lesson.phases) {
      base[entry.phase] = entry.materialIds.length;
    }
    return base;
  }, [lesson.phases]);

  const saveTitle = async () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === lesson.title) {
      setTitleDraft(lesson.title);
      return;
    }
    try {
      await updateLesson({ title: trimmed });
    } catch {
      setTitleDraft(lesson.title);
    }
  };

  const saveReflection = async () => {
    if (reflectionDraft === (lesson.reflectionNotes ?? '')) return;
    try {
      await updateLesson({ reflectionNotes: reflectionDraft });
    } catch {
      setReflectionDraft(lesson.reflectionNotes ?? '');
    }
  };

  const saveObjectives = async (next: string[]) => {
    await updateLesson({ objectives: next });
  };

  return (
    <div className="space-y-5 rounded-lg border bg-card p-4">
      {/* Title */}
      <div>
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
            className="text-lg font-semibold"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="w-full rounded px-1 py-0.5 text-left text-lg font-semibold hover:bg-muted/50"
          >
            <span className="block truncate">{lesson.title}</span>
          </button>
        )}
      </div>

      {/* Status pill + transitions */}
      <div className="flex items-center gap-2">
        <LessonStatusMenu status={lesson.status} onChange={patchStatus} />
      </div>

      {/* Metadata */}
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="truncate font-medium">{subjectName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Topic</dt>
          <dd className="truncate font-medium">{topicTitle}</dd>
        </div>
        {typeof lesson.termNumber === 'number' && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Term</dt>
            <dd className="truncate font-medium">{lesson.termNumber}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="truncate font-medium">{lesson.durationMinutes} min</dd>
        </div>
      </dl>

      {/* Assigned classes — sits between metadata and phase nav, per spec. */}
      <LessonAssignedClasses
        assignedClasses={lesson.assignedClasses}
        onAssign={assignClass}
        onUnassign={unassignClass}
        onUpdate={updateAssignment}
      />

      {/* Objectives */}
      <LessonObjectivesEditor
        initial={lesson.objectives}
        onSave={saveObjectives}
      />

      {/* Phase nav */}
      <LessonPhaseNav counts={phaseCounts} />

      {/* Reflection (only when taught) */}
      {lesson.status === 'taught' && (
        <div className="space-y-2">
          <Label
            htmlFor="reflection"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Reflection
          </Label>
          <Textarea
            id="reflection"
            value={reflectionDraft}
            onChange={(e) => setReflectionDraft(e.target.value)}
            onBlur={() => void saveReflection()}
            placeholder="What worked? What would you change?"
            rows={4}
            className="text-sm"
          />
        </div>
      )}

      {/* Export */}
      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Export
        </Label>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={exporting !== null}
            onClick={() => void onExport('teacher')}
          >
            {exporting === 'teacher' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Teacher Pack
          </Button>
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={exporting !== null}
            onClick={() => void onExport('student')}
          >
            {exporting === 'student' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GraduationCap className="mr-2 h-4 w-4" />
            )}
            Student Pack
          </Button>
        </div>
      </div>
    </div>
  );
}
