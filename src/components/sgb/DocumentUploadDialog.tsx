'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SgbDocumentCategory } from '@/types';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => Promise<void>;
  schoolId: string;
}

interface FormValues {
  title: string;
  category: SgbDocumentCategory;
  description: string;
  policyReviewDate: string;
}

export function DocumentUploadDialog({ open, onOpenChange, onSubmit, schoolId }: DocumentUploadDialogProps) {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFormSubmit = async (values: FormValues) => {
    if (!file) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('schoolId', schoolId);
      formData.append('title', values.title);
      formData.append('category', values.category);
      if (values.description) formData.append('description', values.description);
      if (values.policyReviewDate) {
        formData.append('policyReviewDate', new Date(values.policyReviewDate).toISOString());
      }
      await onSubmit(formData);
      reset();
      setFile(null);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="file">File <span className="text-destructive">*</span></Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.xlsx,.doc,.xls"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
              />
              {!file && <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or XLSX (max 10MB)</p>}
            </div>
            <div>
              <Label htmlFor="docTitle">Title <span className="text-destructive">*</span></Label>
              <Input id="docTitle" {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div>
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select onValueChange={(val: unknown) => setValue('category', val as SgbDocumentCategory)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="financial_statement">Financial Statement</SelectItem>
                  <SelectItem value="audit_report">Audit Report</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="constitution">Constitution</SelectItem>
                  <SelectItem value="annual_report">Annual Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>
            <div>
              <Label htmlFor="reviewDate">Policy Review Date</Label>
              <Input id="reviewDate" type="date" {...register('policyReviewDate')} />
              <p className="text-xs text-muted-foreground mt-1">Only relevant for policy documents</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting || !file}>
              {submitting ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
