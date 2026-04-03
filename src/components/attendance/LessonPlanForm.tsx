'use client';

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
import type { SchoolClass, Subject } from '@/types';

const lessonPlanSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  date: z.string().min(1, 'Date is required'),
  topic: z.string().min(1, 'Topic is required'),
  objectives: z.string().optional(),
  activities: z.string().optional(),
  resources: z.string().optional(),
  homework: z.string().optional(),
  reflectionNotes: z.string().optional(),
});

type LessonPlanFormValues = z.infer<typeof lessonPlanSchema>;

interface LessonPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  subjects: Subject[];
  onSubmit: (data: {
    classId: string;
    subjectId: string;
    date: string;
    topic: string;
    objectives: string[];
    activities: string[];
    resources: string[];
    homework?: string;
    reflectionNotes?: string;
  }) => void;
  initialData?: {
    classId?: string;
    subjectId?: string;
    date?: string;
    topic?: string;
    objectives?: string[];
    activities?: string[];
    resources?: string[];
    homework?: string;
    reflectionNotes?: string;
  };
  title?: string;
}

export function LessonPlanForm({
  open, onOpenChange, classes, subjects, onSubmit, initialData, title,
}: LessonPlanFormProps) {
  const {
    register, handleSubmit, setValue, reset, formState: { errors },
  } = useForm<LessonPlanFormValues>({
    resolver: zodResolver(lessonPlanSchema),
    defaultValues: {
      classId: initialData?.classId ?? '',
      subjectId: initialData?.subjectId ?? '',
      date: initialData?.date ?? new Date().toISOString().split('T')[0],
      topic: initialData?.topic ?? '',
      objectives: initialData?.objectives?.join(', ') ?? '',
      activities: initialData?.activities?.join(', ') ?? '',
      resources: initialData?.resources?.join(', ') ?? '',
      homework: initialData?.homework ?? '',
      reflectionNotes: initialData?.reflectionNotes ?? '',
    },
  });

  const handleFormSubmit = (data: LessonPlanFormValues) => {
    const splitToArray = (val?: string) =>
      val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];

    onSubmit({
      classId: data.classId,
      subjectId: data.subjectId,
      date: new Date(data.date).toISOString(),
      topic: data.topic,
      objectives: splitToArray(data.objectives),
      activities: splitToArray(data.activities),
      resources: splitToArray(data.resources),
      homework: data.homework || undefined,
      reflectionNotes: data.reflectionNotes || undefined,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? 'Create Lesson Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                defaultValue={initialData?.classId}
                onValueChange={(val: unknown) => setValue('classId', val as string)}
              >
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.grade?.name ?? c.gradeName ?? ''} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                defaultValue={initialData?.subjectId}
                onValueChange={(val: unknown) => setValue('subjectId', val as string)}
              >
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" placeholder="e.g., Quadratic Equations" {...register('topic')} />
              {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
            </div>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{initialData ? 'Update' : 'Create'} Plan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
