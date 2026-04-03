'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Policy, CreatePolicyPayload, PolicyCategory, PolicyStatus } from '@/types';

interface PolicyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
  onSubmit: (data: CreatePolicyPayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Policy>) => Promise<void>;
}

interface FormValues {
  title: string;
  category: PolicyCategory;
  content: string;
  fileUrl: string;
  status: PolicyStatus;
  reviewDate: string;
}

const CATEGORY_OPTIONS: { value: PolicyCategory; label: string }[] = [
  { value: 'hr', label: 'HR' },
  { value: 'academic', label: 'Academic' },
  { value: 'safety', label: 'Safety' },
  { value: 'financial', label: 'Financial' },
  { value: 'governance', label: 'Governance' },
  { value: 'general', label: 'General' },
];

const STATUS_OPTIONS: { value: PolicyStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'archived', label: 'Archived' },
];

export function PolicyCreateDialog({
  open,
  onOpenChange,
  policy,
  onSubmit,
  onUpdate,
}: PolicyCreateDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = policy !== null;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      if (policy) {
        reset({
          title: policy.title,
          category: policy.category,
          content: policy.content ?? '',
          fileUrl: policy.fileUrl ?? '',
          status: policy.status,
          reviewDate: policy.reviewDate
            ? policy.reviewDate.slice(0, 10)
            : '',
        });
      } else {
        reset({ title: '', content: '', fileUrl: '', reviewDate: '' });
      }
    }
  }, [open, policy, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: CreatePolicyPayload = {
        title: values.title,
        category: values.category,
        content: values.content || undefined,
        fileUrl: values.fileUrl || undefined,
        status: values.status || undefined,
        reviewDate: values.reviewDate || undefined,
      };

      if (isEditing && onUpdate) {
        await onUpdate(policy.id, payload);
      } else {
        await onSubmit(payload);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue={policy?.category}
                  onValueChange={(val: unknown) =>
                    setValue('category', val as PolicyCategory)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  defaultValue={policy?.status ?? 'draft'}
                  onValueChange={(val: unknown) =>
                    setValue('status', val as PolicyStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="reviewDate">Review Date</Label>
              <Input id="reviewDate" type="date" {...register('reviewDate')} />
            </div>

            <div>
              <Label htmlFor="content">
                Content{' '}
                <span className="text-xs text-muted-foreground">(rich text coming soon)</span>
              </Label>
              <Textarea
                id="content"
                rows={6}
                placeholder="Enter policy content..."
                {...register('content')}
              />
            </div>

            <div>
              <Label htmlFor="fileUrl">File URL</Label>
              <Input
                id="fileUrl"
                type="url"
                placeholder="https://..."
                {...register('fileUrl')}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
