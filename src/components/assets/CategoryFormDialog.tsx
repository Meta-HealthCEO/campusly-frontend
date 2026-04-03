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
import type { AssetCategory, CreateAssetCategoryPayload } from '@/types';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AssetCategory | null;
  parentCategories: AssetCategory[];
  onSubmit: (data: CreateAssetCategoryPayload) => Promise<void>;
  onUpdate: (id: string, data: Partial<AssetCategory>) => Promise<void>;
}

interface FormValues {
  name: string;
  code: string;
  parentId: string;
  description: string;
  depreciationRate: string;
  usefulLifeYears: string;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  parentCategories,
  onSubmit,
  onUpdate,
}: CategoryFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!category;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '',
      code: '',
      parentId: '',
      description: '',
      depreciationRate: '',
      usefulLifeYears: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          code: category.code,
          parentId: category.parentId ?? '',
          description: category.description ?? '',
          depreciationRate: category.depreciationRate != null ? String(category.depreciationRate) : '',
          usefulLifeYears: category.usefulLifeYears != null ? String(category.usefulLifeYears) : '',
        });
      } else {
        reset({
          name: '',
          code: '',
          parentId: '',
          description: '',
          depreciationRate: '',
          usefulLifeYears: '',
        });
      }
    }
  }, [open, category, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const depreciationRate = values.depreciationRate ? parseFloat(values.depreciationRate) : undefined;
      const usefulLifeYears = values.usefulLifeYears ? parseInt(values.usefulLifeYears, 10) : undefined;

      if (isEditing && category) {
        await onUpdate(category.id, {
          name: values.name,
          code: values.code,
          description: values.description || undefined,
          depreciationRate,
          usefulLifeYears,
        });
      } else {
        await onSubmit({
          name: values.name,
          code: values.code,
          parentId: values.parentId && values.parentId !== 'none' ? values.parentId : null,
          description: values.description || undefined,
          depreciationRate,
          usefulLifeYears,
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
          <DialogTitle>{isEditing ? 'Edit Category' : 'New Asset Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="cat-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="cat-name"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cat-code">Code <span className="text-destructive">*</span></Label>
              <Input
                id="cat-code"
                placeholder="e.g. COMP"
                {...register('code', { required: 'Code is required' })}
              />
              {errors.code && (
                <p className="text-xs text-destructive mt-1">{errors.code.message}</p>
              )}
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
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="cat-description">Description</Label>
              <Input id="cat-description" {...register('description')} />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <Label htmlFor="cat-depreciation">Depreciation Rate (%)</Label>
                <Input
                  id="cat-depreciation"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 20"
                  {...register('depreciationRate', {
                    min: { value: 0, message: 'Must be 0 or more' },
                    max: { value: 100, message: 'Must be 100 or less' },
                  })}
                />
                {errors.depreciationRate && (
                  <p className="text-xs text-destructive mt-1">{errors.depreciationRate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="cat-useful-life">Useful Life (years)</Label>
                <Input
                  id="cat-useful-life"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 5"
                  {...register('usefulLifeYears', {
                    min: { value: 1, message: 'Must be at least 1 year' },
                  })}
                />
                {errors.usefulLifeYears && (
                  <p className="text-xs text-destructive mt-1">{errors.usefulLifeYears.message}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
