'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClassSubjectTopicPicker } from '@/components/curriculum/ClassSubjectTopicPicker';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import type { HomeworkWizardType, HomeworkWizardState } from '@/stores/useTeacherHomeworkWizardStore';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useCurriculumTopics } from '@/hooks/useCurriculumTopics';
import { ClipboardList, BookOpen, Target } from 'lucide-react';
import { getClassGradeId, type ClassLike } from '@/lib/teacher-labels';
import type { Subject } from '@/types';

const TYPE_OPTIONS: Array<{
  value: HomeworkWizardType;
  label: string;
  description: string;
  icon: typeof ClipboardList;
}> = [
  {
    value: 'quiz',
    label: 'Quiz',
    description: 'Pick a quiz from the Learning module',
    icon: ClipboardList,
  },
  {
    value: 'reading',
    label: 'Reading',
    description: 'Pick a content resource; AI generates comprehension questions',
    icon: BookOpen,
  },
  {
    value: 'exercise',
    label: 'Exercise',
    description: 'Build a focused practice set',
    icon: Target,
  },
];

export function HomeworkWizardStep1() {
  const state = useTeacherHomeworkWizardStore();
  const { entries, classes } = useTeacherClasses();
  const { topics, loading: topicsLoading } = useCurriculumTopics({
    subjectId: state.subjectId,
    gradeId: state.gradeId,
  });

  const subjects = useMemo(() => {
    const map = new Map<string, Subject & { gradeIds?: string[] }>();
    for (const e of entries) {
      if (!e.subject) continue;
      const gradeId = getClassGradeId(e.class as ClassLike);
      const existing = map.get(e.subject.id);
      if (existing) {
        if (gradeId && !existing.gradeIds?.includes(gradeId)) {
          existing.gradeIds = [...(existing.gradeIds ?? []), gradeId];
        }
        continue;
      }
      if (e.subject) {
        map.set(e.subject.id, {
          ...(e.subject as unknown as Subject),
          id: e.subject.id,
          name: e.subject.name,
          code: e.subject.code,
          gradeIds: gradeId ? [gradeId] : undefined,
        } as unknown as Subject);
      }
    }
    return Array.from(map.values());
  }, [entries]);

  const needsTopic = state.type === 'reading' || state.type === 'exercise';

  const handleTypeChange = (type: HomeworkWizardType) => {
    state.set({
      type,
      quizId: '',
      contentResourceId: '',
      comprehensionQuestionIds: [],
      exerciseQuestionIds: [],
      title: state.title || `${TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Homework'} homework`,
    });
  };

  const handleClassChange = (classId: string, gradeId: string) => {
    state.set({
      classId,
      gradeId,
      subjectId: '',
      curriculumNodeId: '',
      quizId: '',
      contentResourceId: '',
      comprehensionQuestionIds: [],
      exerciseQuestionIds: [],
    });
  };

  const handleSubjectChange = (subjectId: string) => {
    state.set({
      subjectId,
      curriculumNodeId: '',
      quizId: '',
      contentResourceId: '',
      comprehensionQuestionIds: [],
      exerciseQuestionIds: [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>What are you assigning? <span className="text-destructive">*</span></Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = state.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTypeChange(opt.value)}
                className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary ${
                  selected ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Icon className="h-5 w-5 text-primary" />
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Curriculum context</Label>
        <ClassSubjectTopicPicker
          classes={classes}
          subjects={subjects}
          topics={topics}
          topicsLoading={topicsLoading}
          classId={state.classId}
          subjectId={state.subjectId}
          selectedTopicIds={state.curriculumNodeId ? [state.curriculumNodeId] : []}
          onClassChange={handleClassChange}
          onSubjectChange={handleSubjectChange}
          onTopicIdsChange={(ids) => state.set({ curriculumNodeId: ids[0] ?? '' })}
          requireTopic={needsTopic}
          topicLabel="CAPS Topic"
          topicHelpText={
            needsTopic
              ? 'Homework generation should be anchored to one CAPS topic.'
              : 'Optional for quiz homework.'
          }
          topicEmptyText="No CAPS topics found for this class and subject."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="hw-title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-title"
            value={state.title}
            onChange={(e) => state.set({ title: e.target.value })}
            placeholder="Chapter 5 Reading"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hw-dueDate">
            Due date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-dueDate"
            type="datetime-local"
            value={state.dueDate}
            onChange={(e) => state.set({ dueDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hw-totalMarks">
            Total marks <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-totalMarks"
            type="number"
            min={1}
            max={1000}
            value={state.totalMarks || ''}
            onChange={(e) => state.set({ totalMarks: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Late policy */}
      <div className="space-y-3 rounded-lg border p-4">
        <Label>Late submission policy</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['block', 'penalty', 'accept'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => state.set({ latePolicy: p })}
              className={`rounded-md border p-3 text-sm text-left transition-colors hover:border-primary ${
                state.latePolicy === p ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="font-medium capitalize">{p}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {p === 'block' && 'Reject late submissions'}
                {p === 'penalty' && 'Accept with mark penalty'}
                {p === 'accept' && 'Accept, no penalty'}
              </div>
            </button>
          ))}
        </div>

        {state.latePolicy === 'penalty' && (
          <div className="space-y-2">
            <Label htmlFor="hw-penalty">Penalty %</Label>
            <Input
              id="hw-penalty"
              type="number"
              min={0}
              max={100}
              value={state.latePenaltyPercent}
              onChange={(e) => state.set({ latePenaltyPercent: Number(e.target.value) })}
              className="w-full sm:w-24"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Whether step 1's required fields are filled — read by the page footer. */
export function isHomeworkStep1Ready(state: HomeworkWizardState): boolean {
  const needsTopic = state.type === 'reading' || state.type === 'exercise';
  return (
    !!state.type &&
    state.title.trim().length > 0 &&
    !!state.subjectId &&
    !!state.classId &&
    (!needsTopic || !!state.curriculumNodeId) &&
    !!state.dueDate &&
    state.totalMarks > 0 &&
    (state.latePolicy !== 'penalty' ||
      (state.latePenaltyPercent > 0 && state.latePenaltyPercent <= 100))
  );
}
