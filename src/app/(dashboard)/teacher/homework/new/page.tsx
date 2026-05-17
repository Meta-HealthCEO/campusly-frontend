'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { WizardFooter } from '@/components/shared/WizardFooter';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { useTeacherHomeworkMutations } from '@/hooks/useTeacherHomework';
import { HomeworkWizardStep1, isHomeworkStep1Ready } from '@/components/homework/HomeworkWizardStep1';
import { HomeworkWizardStep2, isHomeworkStep2Ready } from '@/components/homework/HomeworkWizardStep2';
import { HomeworkWizardStep3 } from '@/components/homework/HomeworkWizardStep3';

export default function TeacherHomeworkNewPage() {
  const router = useRouter();
  const state = useTeacherHomeworkWizardStore();
  const { createHomework, loading } = useTeacherHomeworkMutations();
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = () => {
    state.reset();
    router.push('/teacher/homework');
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    if (!state.type) {
      toast.error('Choose a homework type first');
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
      return;
    }
    setSubmitting(false);
  };

  const footer = (() => {
    if (state.step === 1) {
      return {
        onNext: () => state.set({ step: 2 }),
        nextLabel: 'Next: Choose Content',
        nextDisabled: !isHomeworkStep1Ready(state),
      };
    }
    if (state.step === 2) {
      return {
        onNext: () => state.set({ step: 3 }),
        nextLabel: 'Review',
        nextDisabled: !isHomeworkStep2Ready(state),
      };
    }
    return {
      onNext: () => void handleSubmit(),
      nextLabel: submitting ? 'Assigning…' : 'Assign Homework',
      nextLoading: submitting,
      nextDisabled: loading || submitting,
      isFinal: true,
    };
  })();

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="New Homework" description={`Step ${state.step} of 3`}>
        <Button variant="outline" size="sm" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />Cancel
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {state.step === 1 && <HomeworkWizardStep1 />}
          {state.step === 2 && <HomeworkWizardStep2 />}
          {state.step === 3 && <HomeworkWizardStep3 />}
        </CardContent>
      </Card>

      <WizardFooter
        step={state.step}
        totalSteps={3}
        onBack={state.step > 1 ? () => state.set({ step: (state.step - 1) as 1 | 2 | 3 }) : undefined}
        {...footer}
      />
    </div>
  );
}
