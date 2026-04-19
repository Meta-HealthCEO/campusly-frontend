'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toISODate } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { TopicCascadePicker } from './TopicCascadePicker';
import { HomeworkBuilder } from './HomeworkBuilder';
import type {
  SchoolClass,
  Subject,
  AIGeneratedLessonDraft,
  StagedHomework,
  HomeworkSuggestion,
} from '@/types';
import type {
  AIGenerateInput,
  CurriculumTopicOption,
} from '@/hooks/useTeacherLessonPlans';

const lessonPlanSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  curriculumTopicId: z.string().min(1, 'Curriculum topic is required'),
  date: z.string().min(1, 'Date is required'),
  topic: z.string().min(1, 'Lesson title is required').max(200),
  durationMinutes: z.number().int().min(5).max(240),
  objectives: z.string().optional(),
  activities: z.string().optional(),
  resources: z.string().optional(),
  reflectionNotes: z.string().optional(),
});

type LessonPlanFormValues = z.infer<typeof lessonPlanSchema>;

interface LessonPlanFormInitialData {
  classId?: string;
  subjectId?: string;
  curriculumTopicId?: string;
  date?: string;
  topic?: string;
  durationMinutes?: number;
  objectives?: string[];
  activities?: string[];
  resources?: string[];
  reflectionNotes?: string;
}

interface LessonPlanFormSubmitData {
  classId: string;
  subjectId: string;
  curriculumTopicId: string;
  date: string;
  topic: string;
  durationMinutes: number;
  objectives: string[];
  activities: string[];
  resources: string[];
  stagedHomework?: StagedHomework[];
  reflectionNotes?: string;
  aiGenerated?: boolean;
}

interface LessonPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  subjects: Subject[];
  topics: CurriculumTopicOption[];
  topicsLoading: boolean;
  onSubjectChange: (subjectId: string) => void;
  onSubmit: (data: LessonPlanFormSubmitData) => void;
  onAIGenerate?: (input: AIGenerateInput) => Promise<AIGeneratedLessonDraft | null>;
  aiGenerating?: boolean;
  initialData?: LessonPlanFormInitialData;
  title?: string;
}

function buildDefaults(initial?: LessonPlanFormInitialData): LessonPlanFormValues {
  return {
    classId: initial?.classId ?? '',
    subjectId: initial?.subjectId ?? '',
    curriculumTopicId: initial?.curriculumTopicId ?? '',
    date: initial?.date
      ? toISODate(new Date(initial.date))
      : toISODate(new Date()),
    topic: initial?.topic ?? '',
    durationMinutes: initial?.durationMinutes ?? 45,
    objectives: initial?.objectives?.join(', ') ?? '',
    activities: initial?.activities?.join(', ') ?? '',
    resources: initial?.resources?.join(', ') ?? '',
    reflectionNotes: initial?.reflectionNotes ?? '',
  };
}

export function LessonPlanForm({
  open, onOpenChange, classes, subjects, topics, topicsLoading, onSubjectChange,
  onSubmit, onAIGenerate, aiGenerating, initialData, title,
}: LessonPlanFormProps) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const {
    register, handleSubmit, setValue, watch, reset, formState: { errors },
  } = useForm<LessonPlanFormValues>({
    resolver: zodResolver(lessonPlanSchema),
    defaultValues: buildDefaults(initialData),
  });

  const subjectId = watch('subjectId');
  const classId = watch('classId');
  const date = watch('date');
  const curriculumTopicId = watch('curriculumTopicId');
  const durationMinutes = watch('durationMinutes');

  const [wasAIGenerated, setWasAIGenerated] = useState(false);
  const [stagedHomework, setStagedHomework] = useState<StagedHomework[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<HomeworkSuggestion[]>([]);

  // Refs track whether a change is user-initiated (skip first render).
  const classIdInitRef = useRef(true);
  const subjectIdInitRef = useRef(true);

  // Reset form when dialog opens (so state doesn't persist across reopens).
  useEffect(() => {
    if (open) {
      reset(buildDefaults(initialData));
      setWasAIGenerated(false);
      setStagedHomework([]);
      setPendingSuggestions([]);
      classIdInitRef.current = true;
      subjectIdInitRef.current = true;
      if (initialData?.subjectId) {
        onSubjectChange(initialData.subjectId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Class change → clear subject + topic + staged homework (skip first run).
  useEffect(() => {
    if (classIdInitRef.current) {
      classIdInitRef.current = false;
      return;
    }
    setValue('subjectId', '');
    setValue('curriculumTopicId', '');
    setStagedHomework([]);
  }, [classId, setValue]);

  // Subject change → clear topic + reload topic list (skip first run).
  useEffect(() => {
    if (subjectIdInitRef.current) {
      subjectIdInitRef.current = false;
      return;
    }
    setValue('curriculumTopicId', '');
    if (subjectId) onSubjectChange(subjectId);
  }, [subjectId, setValue, onSubjectChange]);

  const handleAIGenerate = async () => {
    if (!onAIGenerate || !curriculumTopicId || !classId || !subjectId || !date) return;
    const draft = await onAIGenerate({
      curriculumTopicId,
      classId,
      subjectId,
      date,
      durationMinutes,
    });
    if (!draft) return;
    setValue('topic', draft.topic);
    setValue('objectives', draft.objectives.join(', '));
    setValue('activities', draft.activities.join(', '));
    setValue('resources', draft.resources.join(', '));
    setWasAIGenerated(true);
    const suggestions = draft.homeworkSuggestions ?? [];
    setPendingSuggestions(suggestions);
    toast.success(`AI draft ready${suggestions.length ? ` — ${suggestions.length} homework suggestion(s) to review` : ''}`);
  };

  const handleSuggestionResolved = (s: HomeworkSuggestion): void => {
    setPendingSuggestions((prev: HomeworkSuggestion[]) => prev.filter((x: HomeworkSuggestion) => x !== s));
  };

  const handleFormSubmit = (data: LessonPlanFormValues) => {
    const splitToArray = (val?: string): string[] =>
      val ? val.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    onSubmit({
      classId: data.classId,
      subjectId: data.subjectId,
      curriculumTopicId: data.curriculumTopicId,
      date: new Date(data.date).toISOString(),
      topic: data.topic,
      durationMinutes: data.durationMinutes,
      objectives: splitToArray(data.objectives),
      activities: splitToArray(data.activities),
      resources: splitToArray(data.resources),
      stagedHomework: stagedHomework.length > 0 ? stagedHomework : undefined,
      reflectionNotes: data.reflectionNotes || undefined,
      aiGenerated: wasAIGenerated,
    });
  };

  const canAIGenerate = Boolean(
    onAIGenerate && classId && subjectId && curriculumTopicId && date,
  );
  const dialogTitle = title ?? (initialData ? 'Edit Lesson Plan' : 'Create Lesson Plan');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            <TopicCascadePicker
              classes={classes}
              subjects={subjects}
              topics={topics}
              topicsLoading={topicsLoading}
              classId={classId}
              subjectId={subjectId}
              curriculumTopicId={curriculumTopicId}
              onClassChange={(v: string) => setValue('classId', v, { shouldDirty: true })}
              onSubjectChange={(v: string) => setValue('subjectId', v, { shouldDirty: true })}
              onTopicChange={(v: string) => setValue('curriculumTopicId', v, { shouldDirty: true })}
              errors={{
                classId: errors.classId?.message,
                subjectId: errors.subjectId?.message,
                curriculumTopicId: errors.curriculumTopicId?.message,
              }}
            />

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input id="durationMinutes" type="number" min={5} max={240} placeholder="45"
                  {...register('durationMinutes', { valueAsNumber: true })} />
                {errors.durationMinutes && (
                  <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>
                )}
              </div>
            </div>

            {onAIGenerate && (
              <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> AI-assisted drafting
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Generate a draft from the selected curriculum topic. You can edit before saving.
                  </p>
                </div>
                <TooltipProvider delay={200}>
                  <Tooltip>
                    <TooltipTrigger render={
                      <span className="shrink-0 inline-flex">
                        <Button type="button" variant="outline" size="sm" onClick={handleAIGenerate} disabled={!canAIGenerate || aiGenerating}>
                          {aiGenerating ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                          ) : (
                            <><Sparkles className="mr-2 h-4 w-4" /> Generate with AI</>
                          )}
                        </Button>
                      </span>
                    } />
                    {!canAIGenerate && (
                      <TooltipContent>Select class, subject, date, and curriculum topic to enable AI.</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="topic">Lesson Title <span className="text-destructive">*</span></Label>
              <Input id="topic" placeholder="e.g., Quadratic Equations" {...register('topic')} />
              {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectives">Objectives (comma-separated)</Label>
              <Textarea id="objectives" placeholder="Objective 1, Objective 2" {...register('objectives')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activities">Activities (comma-separated)</Label>
              <Textarea id="activities" placeholder="Activity 1, Activity 2" {...register('activities')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resources">Resources (comma-separated)</Label>
              <Input id="resources" placeholder="Textbook, Whiteboard" {...register('resources')} />
            </div>

            <div className="space-y-2">
              <Label>Homework</Label>
              <HomeworkBuilder
                stagedHomework={stagedHomework}
                setStagedHomework={setStagedHomework}
                plan={initialData}
                classId={classId}
                subjectId={subjectId}
                schoolId={schoolId}
                pendingSuggestions={pendingSuggestions}
                onSuggestionResolved={handleSuggestionResolved}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflectionNotes">Reflection Notes</Label>
              <Textarea id="reflectionNotes" placeholder="Post-lesson reflection" {...register('reflectionNotes')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{initialData ? 'Update' : 'Create'} Plan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
