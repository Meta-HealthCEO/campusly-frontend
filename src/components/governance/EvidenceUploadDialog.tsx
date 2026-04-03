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

interface EvidenceUploadPayload {
  title: string;
  fileUrl: string;
  fileType?: string;
}

interface EvidenceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EvidenceUploadPayload) => Promise<void>;
}

interface FormValues {
  title: string;
  fileUrl: string;
  fileType: string;
}

export function EvidenceUploadDialog({
  open,
  onOpenChange,
  onSubmit,
}: EvidenceUploadDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({ title: '', fileUrl: '', fileType: '' });
    }
  }, [open, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title,
        fileUrl: values.fileUrl,
        fileType: values.fileType || undefined,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Evidence</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="evidence-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="evidence-title"
                placeholder="Evidence title"
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="evidence-file-url">
                File URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="evidence-file-url"
                type="url"
                placeholder="https://..."
                {...register('fileUrl', { required: 'File URL is required' })}
              />
              {errors.fileUrl && (
                <p className="text-xs text-destructive">{errors.fileUrl.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="evidence-file-type">
                File Type{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="evidence-file-type"
                placeholder="e.g. pdf, docx, image"
                {...register('fileType')}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Upload Evidence'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
