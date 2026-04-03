'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import type { ChapterItem, AddChapterPayload, UpdateChapterPayload } from '@/types';

interface ChapterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddChapterPayload | UpdateChapterPayload) => Promise<void>;
  editingChapter: ChapterItem | null;
  /** Next order number for new chapters */
  nextOrder?: number;
}

interface FormValues {
  title: string;
  description: string;
}

function resolveNodeLabel(
  node: ChapterItem['curriculumNodeId'],
): string | null {
  if (!node) return null;
  return typeof node === 'object' ? `${node.code} - ${node.title}` : null;
}

export function ChapterFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editingChapter,
  nextOrder = 0,
}: ChapterFormDialogProps) {
  const isEditing = !!editingChapter;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { title: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      if (editingChapter) {
        reset({
          title: editingChapter.title,
          description: editingChapter.description,
        });
      } else {
        reset({ title: '', description: '' });
      }
    }
  }, [open, editingChapter, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    if (isEditing) {
      const payload: UpdateChapterPayload = {
        title: values.title,
        description: values.description,
      };
      await onSubmit(payload);
    } else {
      const payload: AddChapterPayload = {
        title: values.title,
        description: values.description,
        order: nextOrder,
      };
      await onSubmit(payload);
    }
    onOpenChange(false);
  };

  const nodeLabel = editingChapter
    ? resolveNodeLabel(editingChapter.curriculumNodeId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Chapter' : 'Add Chapter'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto py-4"
        >
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ch-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ch-title"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ch-desc">Description</Label>
            <Textarea id="ch-desc" rows={3} {...register('description')} />
          </div>

          {/* Curriculum node (read-only display if populated) */}
          {nodeLabel && (
            <div className="space-y-2">
              <Label>Curriculum Node</Label>
              <p className="text-sm text-muted-foreground truncate">{nodeLabel}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
