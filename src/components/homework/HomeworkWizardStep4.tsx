'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { useTeacherHomeworkMutations } from '@/hooks/useTeacherHomework';
import { toast } from 'sonner';

export function HomeworkWizardStep4() {
  const state = useTeacherHomeworkWizardStore();
  const { createHomework, loading } = useTeacherHomeworkMutations();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    if (!state.type) {
      toast.error('Type missing — go back and pick a type');
      return;
    }
    setSubmitting(true);
    const base = {
      title: state.title,
      subjectId: state.subjectId,
      classId: state.classId,
      dueDate: new Date(state.dueDate).toISOString(),
      totalMarks: state.totalMarks,
      latePolicy: state.latePolicy,
      ...(state.latePolicy === 'penalty'
        ? { latePenaltyPercent: state.latePenaltyPercent }
        : {}),
      gradebookAutoPublish: state.gradebookAutoPublish,
    };
    const payload =
      state.type === 'quiz'
        ? { ...base, type: 'quiz' as const, quizId: state.quizId }
        : state.type === 'reading'
        ? {
            ...base,
            type: 'reading' as const,
            contentResourceId: state.contentResourceId,
            ...(state.pageRange ? { pageRange: state.pageRange } : {}),
            ...(state.comprehensionQuestionIds.length
              ? { comprehensionQuestionIds: state.comprehensionQuestionIds }
              : {}),
          }
        : {
            ...base,
            type: 'exercise' as const,
            exerciseQuestionIds: state.exerciseQuestionIds,
          };

    const result = await createHomework(payload);
    if (result) {
      toast.success('Homework assigned');
      const id =
        (result as { _id?: string; id?: string })._id ??
        (result as { id?: string }).id ??
        '';
      state.reset();
      router.push(`/teacher/homework/${id}`);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Confirm and click Assign.</p>
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => state.set({ step: 3 })}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={loading || submitting}
        >
          {submitting ? 'Assigning...' : 'Assign Homework'}
        </Button>
      </div>
    </div>
  );
}
