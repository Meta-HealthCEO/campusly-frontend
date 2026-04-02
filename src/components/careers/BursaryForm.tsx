'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  bursarySchema,
  type BursaryFormData,
} from '@/lib/validations/careers';

interface BursaryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BursaryFormData) => Promise<void>;
  initialData?: Partial<BursaryFormData>;
  title?: string;
}

export function BursaryForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = 'Add Bursary',
}: BursaryFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BursaryFormData>({
    resolver: zodResolver(bursarySchema),
    defaultValues: { fieldOfStudy: ['any'], ...initialData },
  });

  useEffect(() => {
    if (open) {
      reset({ fieldOfStudy: ['any'], ...initialData });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: BursaryFormData) => {
    try {
      const payload: BursaryFormData = {
        ...data,
        annualValue: data.annualValue
          ? Math.round(data.annualValue * 100)
          : undefined,
      };
      await onSubmit(payload);
      toast.success(
        initialData ? 'Bursary updated' : 'Bursary created',
      );
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save bursary';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the bursary details below.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Name & Provider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="bur-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bur-name"
                  {...register('name')}
                  placeholder="Bursary name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="bur-provider">
                  Provider <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bur-provider"
                  {...register('provider')}
                  placeholder="e.g. NSFAS"
                />
                {errors.provider && (
                  <p className="text-xs text-destructive">
                    {errors.provider.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="bur-description">Description</Label>
              <Textarea
                id="bur-description"
                {...register('description')}
                placeholder="Brief description of the bursary..."
                rows={3}
              />
            </div>

            {/* Eligibility Criteria */}
            <div className="space-y-1">
              <Label htmlFor="bur-eligibility">Eligibility Criteria</Label>
              <Textarea
                id="bur-eligibility"
                {...register('eligibilityCriteria')}
                placeholder="Who can apply..."
                rows={3}
              />
            </div>

            {/* Minimum APS & Annual Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="bur-aps">Minimum APS</Label>
                <Input
                  id="bur-aps"
                  type="number"
                  min={0}
                  max={42}
                  {...register('minimumAPS', { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.minimumAPS && (
                  <p className="text-xs text-destructive">
                    {errors.minimumAPS.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="bur-value">Annual Value (Rands)</Label>
                <Input
                  id="bur-value"
                  type="number"
                  {...register('annualValue', { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.annualValue && (
                  <p className="text-xs text-destructive">
                    {errors.annualValue.message}
                  </p>
                )}
              </div>
            </div>

            {/* Field of Study */}
            <div className="space-y-1">
              <Label htmlFor="bur-fields">
                Fields of Study (comma-separated)
              </Label>
              <Input
                id="bur-fields"
                defaultValue={initialData?.fieldOfStudy?.join(', ') ?? 'any'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const values = e.target.value
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                  setValue('fieldOfStudy', values.length > 0 ? values : ['any']);
                }}
                placeholder="Engineering, Medicine, any"
              />
            </div>

            {/* Coverage Details */}
            <div className="space-y-1">
              <Label htmlFor="bur-coverage">Coverage Details</Label>
              <Input
                id="bur-coverage"
                {...register('coverageDetails')}
                placeholder="Tuition, accommodation, books..."
              />
            </div>

            {/* Application Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="bur-openDate">Application Open Date</Label>
                <Input
                  id="bur-openDate"
                  type="date"
                  {...register('applicationOpenDate')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bur-closeDate">Application Close Date</Label>
                <Input
                  id="bur-closeDate"
                  type="date"
                  {...register('applicationCloseDate')}
                />
              </div>
            </div>

            {/* Application URL */}
            <div className="space-y-1">
              <Label htmlFor="bur-url">Application URL</Label>
              <Input
                id="bur-url"
                {...register('applicationUrl')}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
