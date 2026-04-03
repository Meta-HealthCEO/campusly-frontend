'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { BudgetCategory, CreateCategoryPayload } from '@/types';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: BudgetCategory | null;
  parentCategories: BudgetCategory[];
  onSubmit: (data: CreateCategoryPayload) => Promise<void>;
  onUpdate: (id: string, data: Partial<BudgetCategory>) => Promise<void>;
}

interface FormValues {
  name: string;
  code: string;
  description: string;
  parentId: string;
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  parentCategories,
  onSubmit,
  onUpdate,
}: CategoryDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!category;
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', code: '', description: '', parentId: '' },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          code: category.code,
          description: category.description ?? '',
          parentId: category.parentId ?? '',
        });
      } else {
        reset({ name: '', code: '', description: '', parentId: '' });
      }
    }
  }, [open, category, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (isEditing && category) {
        await onUpdate(category.id, {
          name: values.name,
          code: values.code,
          description: values.description || undefined,
        });
      } else {
        await onSubmit({
          schoolId: '',
          name: values.name,
          code: values.code,
          description: values.description || undefined,
          parentId: values.parentId || null,
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Input {...register('code', { required: 'Code is required' })} placeholder="e.g. MAINT" />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Input {...register('description')} />
            </div>
            {!isEditing && (
              <div>
                <Label>Parent Category</Label>
                <Select onValueChange={(v: unknown) => setValue('parentId', v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {parentCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
