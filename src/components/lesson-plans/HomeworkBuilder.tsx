'use client';

import { useState } from 'react';
import type {
  StagedHomework,
  Homework,
  HomeworkType,
  HomeworkSuggestion,
} from '@/types';
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
  pendingSuggestions?: HomeworkSuggestion[];
  onSuggestionResolved?: (s: HomeworkSuggestion) => void;
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
  pendingSuggestions,
  onSuggestionResolved,
}: HomeworkBuilderProps) {
  const [isOpen, setOpen] = useState(false);
  const [pickedType, setPickedType] = useState<HomeworkType | null>(null);
  const [seedTitle, setSeedTitle] = useState<string>('');
  const [resolvingSuggestion, setResolvingSuggestion] =
    useState<HomeworkSuggestion | null>(null);
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
    setSeedTitle('');
    setResolvingSuggestion(null);
  };

  const handleAdd = async (hw: StagedHomework): Promise<void> => {
    if (planId) {
      await attachHomework(planId, hw);
    } else {
      setStagedHomework([...stagedHomework, hw]);
    }
    if (resolvingSuggestion && onSuggestionResolved) {
      onSuggestionResolved(resolvingSuggestion);
    }
    resetDialog();
  };

  const handleCompleteSuggestion = (s: HomeworkSuggestion): void => {
    setResolvingSuggestion(s);
    setPickedType(s.type);
    setSeedTitle(s.title);
    setOpen(true);
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
      {pendingSuggestions && pendingSuggestions.length > 0 && (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
          <p className="text-sm font-medium mb-2">
            AI suggestions ({pendingSuggestions.length})
          </p>
          {pendingSuggestions.map((s: HomeworkSuggestion, i: number) => (
            <div
              key={`${s.type}-${i}`}
              className="flex items-center justify-between py-1 gap-2"
            >
              <div className="text-sm min-w-0">
                <span className="capitalize font-medium">{s.type}:</span>{' '}
                <span className="truncate">{s.title}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {s.topicHint}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCompleteSuggestion(s)}
                disabled={!canAdd}
              >
                Complete
              </Button>
            </div>
          ))}
        </div>
      )}

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
          if (!open) {
            setPickedType(null);
            setSeedTitle('');
            setResolvingSuggestion(null);
          }
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
                initialTitle={seedTitle}
                onPicked={handleAdd}
              />
            )}
            {pickedType === 'reading' && (
              <ReadingPicker
                classId={classId}
                subjectId={subjectId}
                schoolId={schoolId}
                initialTitle={seedTitle}
                onPicked={handleAdd}
              />
            )}
            {pickedType === 'exercise' && (
              <ExercisePicker
                classId={classId}
                subjectId={subjectId}
                schoolId={schoolId}
                initialTitle={seedTitle}
                onPicked={handleAdd}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
