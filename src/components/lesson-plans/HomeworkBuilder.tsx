'use client';

import { useState } from 'react';
import type { StagedHomework, Homework, HomeworkType } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useTeacherLessonPlans } from '@/hooks/useTeacherLessonPlans';
import { QuizPicker } from './pickers/QuizPicker';
import { ReadingPicker } from './pickers/ReadingPicker';
import { ExercisePicker } from './pickers/ExercisePicker';

/**
 * The form currently passes `initialData` (a partial form shape with no `_id`)
 * here, while detail views pass a populated LessonPlan. We only read `_id`
 * and `homeworkIds`, so accept any object and read those two fields
 * defensively via the `in` operator. Task 17 tightens `LessonPlanForm` to
 * pass the real `LessonPlan`.
 */
type PlanLike = object;

interface HomeworkBuilderProps {
  stagedHomework: StagedHomework[];
  setStagedHomework: (next: StagedHomework[]) => void;
  plan: PlanLike | null | undefined;
  classId: string;
  subjectId: string;
  schoolId: string;
}

function getPlanId(plan: PlanLike | null | undefined): string | undefined {
  if (!plan || !('_id' in plan)) return undefined;
  const id = (plan as { _id: unknown })._id;
  return typeof id === 'string' ? id : undefined;
}

function getPlanHomework(plan: PlanLike | null | undefined): Homework[] {
  if (!plan || !('homeworkIds' in plan)) return [];
  const ids = (plan as { homeworkIds: unknown }).homeworkIds;
  if (!Array.isArray(ids)) return [];
  // Populated plans return full Homework docs; list plans return IDs (strings).
  return ids.filter((h): h is Homework => typeof h === 'object' && h !== null);
}

const HOMEWORK_TYPES: HomeworkType[] = ['quiz', 'reading', 'exercise'];

export function HomeworkBuilder({
  stagedHomework,
  setStagedHomework,
  plan,
  classId,
  subjectId,
  schoolId,
}: HomeworkBuilderProps) {
  const [isOpen, setOpen] = useState(false);
  const [pickedType, setPickedType] = useState<HomeworkType | null>(null);
  const { attachHomework, detachHomework } = useTeacherLessonPlans();

  const planId = getPlanId(plan);
  const isExistingPlan = Boolean(planId);
  const attached: Array<StagedHomework | Homework> = isExistingPlan
    ? getPlanHomework(plan)
    : stagedHomework;

  const canAdd = Boolean(classId && subjectId);

  const resetDialog = (): void => {
    setOpen(false);
    setPickedType(null);
  };

  const handleAdd = async (hw: StagedHomework): Promise<void> => {
    if (planId) {
      await attachHomework(planId, hw);
    } else {
      setStagedHomework([...stagedHomework, hw]);
    }
    resetDialog();
  };

  const handleRemoveStaged = (index: number): void => {
    setStagedHomework(stagedHomework.filter((_, i) => i !== index));
  };

  const handleRemoveAttached = async (homeworkId: string): Promise<void> => {
    if (!planId) return;
    await detachHomework(planId, homeworkId);
  };

  const renderAttachedItem = (
    hw: StagedHomework | Homework,
    idx: number,
  ) => {
    const isPersisted = '_id' in hw;
    const key = isPersisted ? hw._id : `staged-${idx}`;
    return (
      <div
        key={key}
        className="flex items-center justify-between rounded-md border p-2"
      >
        <div className="min-w-0">
          <div className="font-medium truncate">{hw.title}</div>
          <div className="text-xs text-muted-foreground capitalize">
            {hw.type}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            isPersisted ? handleRemoveAttached(hw._id) : handleRemoveStaged(idx)
          }
          aria-label="Remove homework"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {attached.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No homework attached yet.
        </p>
      )}
      {attached.map(renderAttachedItem)}

      <Dialog
        open={isOpen}
        onOpenChange={(open: boolean) => {
          setOpen(open);
          if (!open) setPickedType(null);
        }}
      >
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canAdd}
            >
              + Add Homework
            </Button>
          }
        />
        <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Homework</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {!pickedType && (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                {HOMEWORK_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setPickedType(t)}
                    className="rounded-md border p-4 text-center hover:bg-muted"
                  >
                    <div className="font-medium capitalize">{t}</div>
                  </button>
                ))}
              </div>
            )}
            {pickedType === 'quiz' && (
              <QuizPicker
                classId={classId}
                subjectId={subjectId}
                schoolId={schoolId}
                onPicked={handleAdd}
              />
            )}
            {pickedType === 'reading' && (
              <ReadingPicker
                classId={classId}
                subjectId={subjectId}
                schoolId={schoolId}
                onPicked={handleAdd}
              />
            )}
            {pickedType === 'exercise' && (
              <ExercisePicker
                classId={classId}
                subjectId={subjectId}
                schoolId={schoolId}
                onPicked={handleAdd}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
