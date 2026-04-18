'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { toISODate } from '@/lib/utils';
import type { SchoolClass, Subject } from '@/types';
import type {
  AIGenerateInput,
  AIGeneratedDraft,
  CurriculumTopicOption,
} from '@/hooks/useTeacherLessonPlans';

const lessonPlanSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  curriculumTopicId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  topic: z.string().min(1, 'Topic is required'),
  objectives: z.string().optional(),
  activities: z.string().optional(),
  resources: z.string().optional(),
  homework: z.string().optional(),
  reflectionNotes: z.string().optional(),
});

type LessonPlanFormValues = z.infer<typeof lessonPlanSchema>;

interface LessonPlanFormInitialData {
  classId?: string;
  subjectId?: string;
  curriculumTopicId?: string;
  date?: string;
  topic?: string;
  objectives?: string[];
  activities?: string[];
  resources?: string[];
  homework?: string;
  reflectionNotes?: string;
}

interface LessonPlanFormSubmitData {
  classId: string;
  subjectId: string;
  curriculumTopicId?: string;
  date: string;
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homework?: string;
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
  onAIGenerate?: (input: AIGenerateInput) => Promise<AIGeneratedDraft | null>;
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
    objectives: initial?.objectives?.join(', ') ?? '',
    activities: initial?.activities?.join(', ') ?? '',
    resources: initial?.resources?.join(', ') ?? '',
    homework: initial?.homework ?? '',
    reflectionNotes: initial?.reflectionNotes ?? '',
  };
}

export function LessonPlanForm({
  open, onOpenChange, classes, subjects, topics, topicsLoading, onSubjectChange,
  onSubmit, onAIGenerate, aiGenerating, initialData, title,
}: LessonPlanFormProps) {
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

  const [wasAIGenerated, setWasAIGenerated] = useState(false);

  // Reset form when dialog opens (so state doesn't persist across reopens).
  useEffect(() => {
    if (open) {
      reset(buildDefaults(initialData));
      setWasAIGenerated(false);
      if (initialData?.subjectId) {
        onSubjectChange(initialData.subjectId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubjectSelect = (val: string) => {
    setValue('subjectId', val);
    // Clear topic when subject changes (topic list will be refreshed).
    setValue('curriculumTopicId', '');
    onSubjectChange(val);
  };

  const handleAIGenerate = async () => {
    if (!onAIGenerate || !curriculumTopicId || !classId || !subjectId || !date) return;
    const draft = await onAIGenerate({
      curriculumTopicId,
      classId,
      subjectId,
      date,
    });
    if (!draft) return;
    setValue('topic', draft.topic);
    setValue('objectives', draft.objectives.join(', '));
    setValue('activities', draft.activities.join(', '));
    setValue('resources', draft.resources.join(', '));
    setValue('homework', draft.homework ?? '');
    setWasAIGenerated(true);
  };

  const handleFormSubmit = (data: LessonPlanFormValues) => {
    const splitToArray = (val?: string): string[] =>
      val ? val.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    onSubmit({
      classId: data.classId,
      subjectId: data.subjectId,
      curriculumTopicId: data.curriculumTopicId || undefined,
      date: new Date(data.date).toISOString(),
      topic: data.topic,
      objectives: splitToArray(data.objectives),
      activities: splitToArray(data.activities),
      resources: splitToArray(data.resources),
      homework: data.homework || undefined,
      reflectionNotes: data.reflectionNotes || undefined,
      aiGenerated: wasAIGenerated,
    });
  };

  const canAIGenerate = !!(onAIGenerate && curriculumTopicId && classId && subjectId && date);
  const dialogTitle = title ?? (initialData ? 'Edit Lesson Plan' : 'Create Lesson Plan');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Class <span className="text-destructive">*</span></Label>
                <Select
                  value={classId || ''}
                  onValueChange={(val: unknown) => setValue('classId', val as string)}
                >
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: SchoolClass) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.grade?.name ?? c.gradeName ?? ''} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select
                  value={subjectId || ''}
                  onValueChange={(val: unknown) => handleSubjectSelect(val as string)}
                >
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: Subject) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Curriculum Topic</Label>
                <Select
                  value={curriculumTopicId || ''}
                  onValueChange={(val: unknown) => setValue('curriculumTopicId', val as string)}
                  disabled={!subjectId || topicsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !subjectId ? 'Select subject first'
                        : topicsLoading ? 'Loading topics...'
                          : topics.length === 0 ? 'No topics available'
                            : 'Select topic (optional)'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t: CurriculumTopicOption) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.code ? `${t.code} — ` : ''}{t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {onAIGenerate && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI-assisted drafting
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {canAIGenerate
                        ? 'Generate a draft from the selected curriculum topic. You can edit before saving.'
                        : 'Select class, subject, date, and a curriculum topic to enable AI drafting.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIGenerate}
                    disabled={!canAIGenerate || aiGenerating}
                    className="shrink-0"
                  >
                    {aiGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Generate with AI</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="topic">Topic <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="homework">Homework</Label>
              <Input id="homework" placeholder="Optional homework assignment" {...register('homework')} />
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
