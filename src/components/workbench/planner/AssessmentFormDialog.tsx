'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { PlannedAssessment, CurriculumTopic, AssessmentPlanType } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['test', 'exam', 'assignment', 'practical', 'project']),
  plannedDate: z.string().min(1, 'Date is required'),
  marks: z.number().min(1, 'Marks must be at least 1'),
  weight: z.number().min(0).max(100, 'Weight must be 0-100'),
  topicIds: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlannedAssessment) => void;
  initialData?: PlannedAssessment;
  defaultDate?: string;
  topics: CurriculumTopic[];
  loadingTopics?: boolean;
}

const TYPES: AssessmentPlanType[] = ['test', 'exam', 'assignment', 'practical', 'project'];

export function AssessmentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  defaultDate = '',
  topics,
  loadingTopics = false,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      type: 'test',
      plannedDate: '',
      marks: 100,
      weight: 0,
      topicIds: [],
    },
  });

  const selectedTopicIds = watch('topicIds');
  const selectedType = watch('type');

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          title: initialData.title,
          type: initialData.type,
          plannedDate: initialData.plannedDate.slice(0, 10),
          marks: initialData.marks,
          weight: initialData.weight,
          topicIds: initialData.topicIds,
        });
      } else {
        reset({ title: '', type: 'test', plannedDate: defaultDate, marks: 100, weight: 0, topicIds: [] });
      }
    }
  }, [defaultDate, open, initialData, reset]);

  function handleFormSubmit(data: FormData) {
    onSubmit({
      title: data.title,
      type: data.type as AssessmentPlanType,
      plannedDate: data.plannedDate,
      marks: data.marks,
      weight: data.weight,
      topicIds: data.topicIds,
      assessmentId: initialData?.assessmentId ?? null,
      linkedPaperId: initialData?.linkedPaperId ?? initialData?.assessmentId ?? null,
      status: initialData?.status ?? 'planned',
    });
    onOpenChange(false);
  }

  function toggleTopic(topicId: string) {
    const current = selectedTopicIds ?? [];
    const next = current.includes(topicId)
      ? current.filter((id) => id !== topicId)
      : [...current, topicId];
    setValue('topicIds', next, { shouldDirty: true });
  }

  function handleTypeChange(value: AssessmentPlanType) {
    setValue('type', value, { shouldDirty: true });
  }

  function topicIsSelected(topicId: string) {
    return (selectedTopicIds ?? []).includes(topicId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Assessment' : 'Add Assessment'}</DialogTitle>
        </DialogHeader>

        <form
          id="assessment-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input id="title" {...register('title')} placeholder="Assessment title" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Type <span className="text-destructive">*</span></Label>
            <Select
              value={selectedType}
              onValueChange={(val: unknown) =>
                handleTypeChange(val as AssessmentPlanType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plannedDate">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input id="plannedDate" type="date" {...register('plannedDate')} />
            {errors.plannedDate && (
              <p className="text-xs text-destructive">{errors.plannedDate.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="marks">Marks <span className="text-destructive">*</span></Label>
              <Input id="marks" type="number" min={1} {...register('marks', { valueAsNumber: true })} />
              {errors.marks && (
                <p className="text-xs text-destructive">{errors.marks.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (%) <span className="text-destructive">*</span></Label>
              <Input id="weight" type="number" min={0} max={100} {...register('weight', { valueAsNumber: true })} />
              {errors.weight && (
                <p className="text-xs text-destructive">{errors.weight.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Topics Covered</Label>
            {loadingTopics ? (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">Loading topics...</p>
            ) : topics.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
                {topics.map((topic) => {
                  const topicId = topic.id ?? topic._id ?? '';
                  if (!topicId) return null;
                  const label = topic.name || topic.title || 'Untitled topic';
                  return (
                    <label
                      key={topicId}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                    >
                      <Checkbox
                        checked={topicIsSelected(topicId)}
                        onCheckedChange={() => toggleTopic(topicId)}
                      />
                      <span className="text-sm truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">
                No topics are available for this subject and term yet.
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="assessment-form" disabled={isSubmitting}>
            {initialData ? 'Update' : 'Add Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
