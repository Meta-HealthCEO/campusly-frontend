'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Course } from '@/types';
import type { CreateCourseInput } from '@/hooks/useTeacherCourses';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const FORM_ID = 'create-course-form';

const createCourseFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(80)
    .regex(SLUG_REGEX, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(2000).optional(),
  gradeLevel: z
    .string()
    .optional()
    .refine(
      (v) =>
        v === '' ||
        v === undefined ||
        (!isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 12),
      { message: 'Grade level must be a number between 1 and 12' },
    ),
});

type CreateCourseFormValues = z.infer<typeof createCourseFormSchema>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateCourseInput) => Promise<Course | null>;
  onCreated?: (course: Course) => void;
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: CreateCourseDialogProps) {
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { title: '', slug: '', description: '' },
  });

  // Auto-generate the slug from the title until the user touches the slug
  // field themselves.
  const title = watch('title');
  const onTitleBlur = () => {
    if (!slugManuallyEdited && title) {
      setValue('slug', slugify(title), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateCourseFormValues) => {
    const parsedGrade =
      data.gradeLevel && data.gradeLevel !== '' ? parseInt(data.gradeLevel, 10) : null;
    const created = await onCreate({
      title: data.title,
      slug: data.slug,
      description: data.description ?? '',
      gradeLevel: parsedGrade,
    });
    if (created) {
      reset();
      setSlugManuallyEdited(false);
      onOpenChange(false);
      onCreated?.(created);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          reset();
          setSlugManuallyEdited(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Create Course</DialogTitle>
        </DialogHeader>
        {/* The form wraps only the scrollable body; the submit button in the
            footer uses form={FORM_ID} to submit across the DOM boundary. */}
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto py-2 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Grade 10 Introduction to Algebra"
              {...register('title', { onBlur: onTitleBlur })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              URL slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              placeholder="grade-10-intro-algebra"
              {...register('slug', {
                onChange: () => setSlugManuallyEdited(true),
              })}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only. Used in the course URL.
            </p>
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Short summary shown on the catalog card..."
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradeLevel">Grade level (optional)</Label>
            <Input
              id="gradeLevel"
              type="number"
              min={1}
              max={12}
              placeholder="e.g. 10"
              {...register('gradeLevel')}
            />
            {errors.gradeLevel && (
              <p className="text-xs text-destructive">{errors.gradeLevel.message}</p>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
