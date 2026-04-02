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
  universitySchema,
  type UniversityFormData,
} from '@/lib/validations/careers';
import { SA_PROVINCES } from '@/lib/constants';

const UNIVERSITY_TYPES = [
  { value: 'traditional', label: 'Traditional' },
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'university_of_technology', label: 'University of Technology' },
  { value: 'tvet', label: 'TVET College' },
  { value: 'private', label: 'Private' },
] as const;

interface UniversityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UniversityFormData) => Promise<void>;
  initialData?: Partial<UniversityFormData>;
  title?: string;
}

export function UniversityForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = 'Add University',
}: UniversityFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UniversityFormData>({
    resolver: zodResolver(universitySchema),
    defaultValues: { applicationFee: 0, ...initialData },
  });

  useEffect(() => {
    if (open) {
      reset({ applicationFee: 0, ...initialData });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: UniversityFormData) => {
    try {
      await onSubmit({
        ...data,
        applicationFee: Math.round(data.applicationFee * 100),
      });
      toast.success(
        initialData ? 'University updated' : 'University created',
      );
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save university';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the university details below.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Name & Short Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uni-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="uni-name"
                  {...register('name')}
                  placeholder="University of Cape Town"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="uni-shortName">
                  Short Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="uni-shortName"
                  {...register('shortName')}
                  placeholder="UCT"
                />
                {errors.shortName && (
                  <p className="text-xs text-destructive">
                    {errors.shortName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={initialData?.type}
                onValueChange={(val: unknown) =>
                  setValue('type', val as UniversityFormData['type'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            {/* Province & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Province <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue={initialData?.province}
                  onValueChange={(val: unknown) =>
                    setValue('province', val as string)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {SA_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.province && (
                  <p className="text-xs text-destructive">
                    {errors.province.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="uni-city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="uni-city"
                  {...register('city')}
                  placeholder="Cape Town"
                />
                {errors.city && (
                  <p className="text-xs text-destructive">
                    {errors.city.message}
                  </p>
                )}
              </div>
            </div>

            {/* Logo & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uni-logo">Logo URL</Label>
                <Input
                  id="uni-logo"
                  {...register('logo')}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uni-website">Website</Label>
                <Input
                  id="uni-website"
                  {...register('website')}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Application Portal & Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uni-portal">Application Portal URL</Label>
                <Input
                  id="uni-portal"
                  {...register('applicationPortalUrl')}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uni-fee">Application Fee (Rands)</Label>
                <Input
                  id="uni-fee"
                  type="number"
                  {...register('applicationFee', { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.applicationFee && (
                  <p className="text-xs text-destructive">
                    {errors.applicationFee.message}
                  </p>
                )}
              </div>
            </div>

            {/* Application Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uni-openDate">Application Open Date</Label>
                <Input
                  id="uni-openDate"
                  type="date"
                  {...register('applicationOpenDate')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uni-closeDate">Application Close Date</Label>
                <Input
                  id="uni-closeDate"
                  type="date"
                  {...register('applicationCloseDate')}
                />
              </div>
            </div>

            {/* General Requirements */}
            <div className="space-y-1">
              <Label htmlFor="uni-requirements">General Requirements</Label>
              <Textarea
                id="uni-requirements"
                {...register('generalRequirements')}
                placeholder="Admission requirements..."
                rows={3}
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uni-email">Contact Email</Label>
                <Input
                  id="uni-email"
                  type="email"
                  {...register('contactEmail')}
                  placeholder="admissions@university.ac.za"
                />
                {errors.contactEmail && (
                  <p className="text-xs text-destructive">
                    {errors.contactEmail.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="uni-phone">Contact Phone</Label>
                <Input
                  id="uni-phone"
                  {...register('contactPhone')}
                  placeholder="021 000 0000"
                />
              </div>
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
