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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  TextbookItem,
  CreateTextbookPayload,
  UpdateTextbookPayload,
} from '@/types';

interface OptionItem {
  id: string;
  name: string;
}

interface TextbookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitCreate: (data: CreateTextbookPayload) => Promise<void>;
  onSubmitUpdate: (id: string, data: UpdateTextbookPayload) => Promise<void>;
  editingTextbook: TextbookItem | null;
  frameworks: OptionItem[];
  subjects: OptionItem[];
  grades: OptionItem[];
}

interface FormValues {
  title: string;
  description: string;
  frameworkId: string;
  subjectId: string;
  gradeId: string;
  coverImageUrl: string;
}

const DEFAULTS: FormValues = {
  title: '',
  description: '',
  frameworkId: '',
  subjectId: '',
  gradeId: '',
  coverImageUrl: '',
};

function resolveId(field: string | { id: string; name: string }): string {
  return typeof field === 'object' ? field.id : field;
}

export function TextbookFormDialog({
  open,
  onOpenChange,
  onSubmitCreate,
  onSubmitUpdate,
  editingTextbook,
  frameworks,
  subjects,
  grades,
}: TextbookFormDialogProps) {
  const isEditing = !!editingTextbook;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) {
      if (editingTextbook) {
        reset({
          title: editingTextbook.title,
          description: editingTextbook.description,
          frameworkId: resolveId(editingTextbook.frameworkId),
          subjectId: resolveId(editingTextbook.subjectId),
          gradeId: resolveId(editingTextbook.gradeId),
          coverImageUrl: editingTextbook.coverImageUrl,
        });
      } else {
        reset(DEFAULTS);
      }
    }
  }, [open, editingTextbook, reset]);

  const onSubmit = async (values: FormValues) => {
    if (isEditing && editingTextbook) {
      await onSubmitUpdate(editingTextbook.id, {
        title: values.title,
        description: values.description,
        coverImageUrl: values.coverImageUrl,
      });
    } else {
      await onSubmitCreate({
        title: values.title,
        description: values.description,
        frameworkId: values.frameworkId,
        subjectId: values.subjectId,
        gradeId: values.gradeId,
        coverImageUrl: values.coverImageUrl,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Textbook' : 'Create Textbook'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto py-4"
        >
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="tb-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tb-title"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tb-desc">Description</Label>
            <Textarea id="tb-desc" rows={3} {...register('description')} />
          </div>

          {/* Framework selector — disabled when editing */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>
                Framework <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(val: unknown) => setValue('frameworkId', val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  {frameworks.map((f: OptionItem) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject selector — disabled when editing */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>
                Subject <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(val: unknown) => setValue('subjectId', val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: OptionItem) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Grade selector — disabled when editing */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>
                Grade <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(val: unknown) => setValue('gradeId', val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g: OptionItem) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="tb-cover">Cover Image URL</Label>
            <Input
              id="tb-cover"
              placeholder="https://..."
              {...register('coverImageUrl')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
