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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { RESOURCE_TYPE_LABELS } from '@/lib/design-system';
import type { SchoolClass } from '@/types';
import type { ResourceType } from '@/types/content-library';

// ─── Schema ────────────────────────────────────────────────────────────────

const assignSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  instructions: z.string(),
  totalMarks: z.string().min(1, 'Total marks is required'),
});

export type AssignHomeworkFormValues = z.infer<typeof assignSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────

interface AssignHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceTitle: string;
  resourceType: ResourceType;
  classes: SchoolClass[];
  defaultTotalMarks?: number;
  onSubmit: (data: AssignHomeworkFormValues) => Promise<void>;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AssignHomeworkDialog({
  open,
  onOpenChange,
  resourceTitle,
  resourceType,
  classes,
  defaultTotalMarks = 0,
  onSubmit,
}: AssignHomeworkDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignHomeworkFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      classId: '',
      dueDate: '',
      instructions: '',
      totalMarks: String(defaultTotalMarks || 10),
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        classId: '',
        dueDate: '',
        instructions: '',
        totalMarks: String(defaultTotalMarks || 10),
      });
    }
  }, [open, defaultTotalMarks, reset]);

  const handleFormSubmit = async (data: AssignHomeworkFormValues) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Assign as Homework</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <form
            id="assign-homework-form"
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            {/* Resource info (read-only) */}
            <div className="space-y-1">
              <Label>Resource</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <span className="text-sm font-medium truncate">{resourceTitle}</span>
                <Badge variant="secondary" className="shrink-0">
                  {RESOURCE_TYPE_LABELS[resourceType]}
                </Badge>
              </div>
            </div>

            {/* Class selector */}
            <div className="space-y-2">
              <Label>
                Class <span className="text-destructive">*</span>
              </Label>
              <Select onValueChange={(val: unknown) => setValue('classId', val as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem
                      key={cls.id ?? (cls as unknown as { _id: string })._id}
                      value={cls.id ?? (cls as unknown as { _id: string })._id}
                    >
                      {cls.grade?.name ?? cls.gradeName ?? ''} {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classId && (
                <p className="text-xs text-destructive">{errors.classId.message}</p>
              )}
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <Label htmlFor="assign-dueDate">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assign-dueDate"
                type="date"
                className="w-full"
                {...register('dueDate')}
              />
              {errors.dueDate && (
                <p className="text-xs text-destructive">{errors.dueDate.message}</p>
              )}
            </div>

            {/* Total marks */}
            <div className="space-y-2">
              <Label htmlFor="assign-totalMarks">
                Total Marks <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assign-totalMarks"
                type="number"
                min={1}
                placeholder="e.g. 50"
                className="w-full"
                {...register('totalMarks')}
              />
              {errors.totalMarks && (
                <p className="text-xs text-destructive">{errors.totalMarks.message}</p>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="assign-instructions">Additional Instructions</Label>
              <Textarea
                id="assign-instructions"
                placeholder="Optional instructions for students..."
                {...register('instructions')}
              />
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-homework-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Homework'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
