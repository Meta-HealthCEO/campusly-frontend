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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  programmeSchema,
  type ProgrammeFormData,
} from '@/lib/validations/careers';

const QUALIFICATION_TYPES = [
  { value: 'bachelor', label: 'Bachelor\'s Degree' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'higher_certificate', label: 'Higher Certificate' },
  { value: 'postgrad_diploma', label: 'Postgrad Diploma' },
] as const;

interface ProgrammeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProgrammeFormData) => Promise<void>;
  universities: { id: string; name: string }[];
  initialData?: Partial<ProgrammeFormData>;
  title?: string;
}

export function ProgrammeForm({
  open,
  onOpenChange,
  onSubmit,
  universities,
  initialData,
  title = 'Add Programme',
}: ProgrammeFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(programmeSchema),
    defaultValues: { minimumAPS: 0, careerOutcomes: [], ...initialData },
  });

  useEffect(() => {
    if (open) {
      reset({ minimumAPS: 0, careerOutcomes: [], ...initialData });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: unknown) => {
    try {
      const formData = data as unknown as ProgrammeFormData;
      const payload: ProgrammeFormData = {
        ...formData,
        annualTuition: formData.annualTuition
          ? Math.round(formData.annualTuition * 100)
          : undefined,
      };
      await onSubmit(payload);
      toast.success(
        initialData ? 'Programme updated' : 'Programme created',
      );
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save programme';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the programme details below.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* University */}
            <div className="space-y-1">
              <Label>
                University <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={initialData?.universityId}
                onValueChange={(val: unknown) =>
                  setValue('universityId', val as string)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.universityId && (
                <p className="text-xs text-destructive">
                  {errors.universityId.message}
                </p>
              )}
            </div>

            {/* Faculty & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prog-faculty">
                  Faculty <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prog-faculty"
                  {...register('faculty')}
                  placeholder="e.g. Engineering"
                />
                {errors.faculty && (
                  <p className="text-xs text-destructive">
                    {errors.faculty.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="prog-department">Department</Label>
                <Input
                  id="prog-department"
                  {...register('department')}
                  placeholder="e.g. Electrical"
                />
              </div>
            </div>

            {/* Programme Name */}
            <div className="space-y-1">
              <Label htmlFor="prog-name">
                Programme Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prog-name"
                {...register('name')}
                placeholder="BSc Computer Science"
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Qualification Type & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Qualification Type{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue={initialData?.qualificationType}
                  onValueChange={(val: unknown) =>
                    setValue(
                      'qualificationType',
                      val as ProgrammeFormData['qualificationType'],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_TYPES.map((qt) => (
                      <SelectItem key={qt.value} value={qt.value}>
                        {qt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.qualificationType && (
                  <p className="text-xs text-destructive">
                    {errors.qualificationType.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="prog-duration">
                  Duration <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prog-duration"
                  {...register('duration')}
                  placeholder="e.g. 3 years"
                />
                {errors.duration && (
                  <p className="text-xs text-destructive">
                    {errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            {/* Minimum APS & Annual Tuition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prog-aps">
                  Minimum APS <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prog-aps"
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
                <Label htmlFor="prog-tuition">
                  Annual Tuition (Rands)
                </Label>
                <Input
                  id="prog-tuition"
                  type="number"
                  {...register('annualTuition', { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.annualTuition && (
                  <p className="text-xs text-destructive">
                    {errors.annualTuition.message}
                  </p>
                )}
              </div>
            </div>

            {/* Career Outcomes */}
            <div className="space-y-1">
              <Label htmlFor="prog-careers">
                Career Outcomes (comma-separated)
              </Label>
              <Input
                id="prog-careers"
                defaultValue={initialData?.careerOutcomes?.join(', ') ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const values = e.target.value
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                  setValue('careerOutcomes', values);
                }}
                placeholder="Software Engineer, Data Analyst"
              />
            </div>

            {/* Application Deadline */}
            <div className="space-y-1">
              <Label htmlFor="prog-deadline">Application Deadline</Label>
              <Input
                id="prog-deadline"
                type="date"
                {...register('applicationDeadline')}
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-1">
              <Label htmlFor="prog-notes">Additional Notes</Label>
              <Textarea
                id="prog-notes"
                {...register('additionalNotes')}
                placeholder="Any additional information..."
                rows={3}
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
