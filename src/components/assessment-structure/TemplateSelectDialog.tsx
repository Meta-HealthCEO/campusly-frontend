'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileStack } from 'lucide-react';
import type { AssessmentStructure, FromTemplatePayload } from '@/types';

interface FormValues {
  name: string;
  term: string;
  academicYear: number;
}

const CURRENT_YEAR = new Date().getFullYear();

interface Props {
  open: boolean;
  onClose: () => void;
  templates: AssessmentStructure[];
  onUseTemplate: (templateId: string, payload: FromTemplatePayload) => Promise<unknown>;
}

export function TemplateSelectDialog({ open, onClose, templates, onUseTemplate }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentStructure | null>(null);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', term: '1', academicYear: CURRENT_YEAR },
  });

  const watchTerm = watch('term');

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedTemplate(null);
      setSubmitError('');
      reset({ name: '', term: '1', academicYear: CURRENT_YEAR });
    }
  }, [open, reset]);

  const handleSelectTemplate = (tpl: AssessmentStructure) => {
    setSelectedTemplate(tpl);
    reset({ name: tpl.templateName ?? tpl.name, term: '1', academicYear: CURRENT_YEAR });
    setStep(2);
  };

  const onSubmit = async (data: FormValues) => {
    if (!selectedTemplate) return;
    setSubmitError('');
    try {
      const payload: FromTemplatePayload = {
        name: data.name,
        subjectId: selectedTemplate.subjectId,
        subjectName: selectedTemplate.subjectName,
        classId: selectedTemplate.classId,
        gradeId: selectedTemplate.gradeId,
        term: parseInt(data.term, 10),
        academicYear: data.academicYear,
      };
      await onUseTemplate(selectedTemplate.id, payload);
      onClose();
    } catch (err: unknown) {
      setSubmitError((err as { message?: string })?.message ?? 'Failed to use template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Choose a Template' : 'Configure from Template'}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Select a saved template to base your new structure on.'
              : `Configuring from: ${selectedTemplate?.templateName ?? selectedTemplate?.name}`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {templates.length === 0 ? (
                <EmptyState
                  icon={FileStack}
                  title="No templates"
                  description="No saved templates available. Save a structure as a template first."
                />
              ) : (
                templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className="w-full text-left border rounded-md p-3 hover:bg-muted transition-colors"
                  >
                    <p className="font-medium truncate">{tpl.templateName ?? tpl.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {tpl.subjectName} &mdash; {tpl.categories.length} categories
                    </p>
                  </button>
                ))
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <div>
                <Label htmlFor="tsd-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tsd-name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label>
                  Term <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watchTerm}
                  onValueChange={(val: unknown) => setValue('term', val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((t) => (
                      <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tsd-year">
                  Year <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tsd-year"
                  type="number"
                  {...register('academicYear', {
                    required: 'Year is required',
                    valueAsNumber: true,
                    min: { value: 2020, message: 'Year must be 2020 or later' },
                  })}
                />
                {errors.academicYear && (
                  <p className="text-xs text-destructive mt-1">{errors.academicYear.message}</p>
                )}
              </div>

              {submitError && (
                <p className="text-xs text-destructive">{submitError}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create from Template'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
