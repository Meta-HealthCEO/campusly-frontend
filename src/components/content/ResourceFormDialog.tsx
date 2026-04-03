'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BlockEditor } from './BlockEditor';
import type {
  ContentBlockItem,
  CreateResourcePayload,
  ResourceType,
} from '@/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'study_notes', label: 'Study Notes' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'worked_example', label: 'Worked Example' },
  { value: 'activity', label: 'Activity' },
];

const DIFFICULTY_OPTIONS = [
  { value: '1', label: '1 - Easy' },
  { value: '2', label: '2 - Medium' },
  { value: '3', label: '3 - Hard' },
  { value: '4', label: '4 - Advanced' },
];

const INTERACTIVE_BLOCK_TYPES = [
  'quiz', 'drag_drop', 'fill_blank', 'match_columns',
  'ordering', 'hotspot', 'step_reveal',
];

// ─── Form Type ──────────────────────────────────────────────────────────────

interface FormValues {
  title: string;
  type: ResourceType;
  subjectId: string;
  gradeId: string;
  term: number;
  difficulty: number;
  estimatedMinutes: number;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: string; name: string }[];
  grades: { id: string; name: string }[];
  selectedNodeId: string | null;
  selectedNodeTitle: string | null;
  onSubmit: (data: CreateResourcePayload, blocks: ContentBlockItem[]) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ResourceFormDialog({
  open,
  onOpenChange,
  subjects,
  grades,
  selectedNodeId,
  selectedNodeTitle,
  onSubmit,
}: ResourceFormDialogProps) {
  const [blockList, setBlockList] = useState<ContentBlockItem[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      type: 'lesson',
      subjectId: '',
      gradeId: '',
      term: 1,
      difficulty: 2,
      estimatedMinutes: 30,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        type: 'lesson',
        subjectId: '',
        gradeId: '',
        term: 1,
        difficulty: 2,
        estimatedMinutes: 30,
      });
      setBlockList([]);
    }
  }, [open, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    const payload: CreateResourcePayload = {
      title: values.title,
      type: values.type,
      format: blockList.some((b) => INTERACTIVE_BLOCK_TYPES.includes(b.type))
        ? 'interactive'
        : 'static',
      subjectId: values.subjectId,
      gradeId: values.gradeId,
      term: values.term,
      difficulty: values.difficulty,
      estimatedMinutes: values.estimatedMinutes,
      blocks: blockList.map(({ blockId: _id, ...rest }) => rest),
      ...(selectedNodeId ? { curriculumNodeId: selectedNodeId } : {}),
    };
    await onSubmit(payload, blockList);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Resource</DialogTitle>
          <DialogDescription>
            Add a new content resource
            {selectedNodeTitle ? ` for "${selectedNodeTitle}"` : ''}.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            {/* Title */}
            <div>
              <Label htmlFor="res-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="res-title"
                {...register('title', { required: 'Title is required' })}
                placeholder="Enter resource title"
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Curriculum node (display only) */}
            {selectedNodeTitle && (
              <div>
                <Label>Curriculum Node</Label>
                <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {selectedNodeTitle}
                </p>
              </div>
            )}

            {/* Type + Subject + Grade */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={watch('type')}
                  onValueChange={(v: unknown) => setValue('type', v as ResourceType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select
                  value={watch('subjectId')}
                  onValueChange={(v: unknown) => setValue('subjectId', v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade</Label>
                <Select
                  value={watch('gradeId')}
                  onValueChange={(v: unknown) => setValue('gradeId', v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Term + Difficulty + Minutes */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="res-term">Term</Label>
                <Input
                  id="res-term"
                  type="number"
                  min={1}
                  max={4}
                  {...register('term', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={String(watch('difficulty'))}
                  onValueChange={(v: unknown) => setValue('difficulty', Number(v) || 2)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="res-minutes">Est. Minutes</Label>
                <Input
                  id="res-minutes"
                  type="number"
                  min={1}
                  {...register('estimatedMinutes', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Block editor */}
            <div>
              <Label>Content Blocks</Label>
              <div className="mt-1">
                <BlockEditor blocks={blockList} onChange={setBlockList} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
