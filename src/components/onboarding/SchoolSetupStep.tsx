'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SA_PROVINCES } from '@/lib/constants';

const schoolSetupSchema = z.object({
  name: z.string().min(2, 'School name is required'),
  type: z.string().min(1, 'School type is required'),
  province: z.string().min(1, 'Province is required'),
});

type SchoolSetupData = z.infer<typeof schoolSetupSchema>;

interface SchoolSetupStepProps {
  defaultName: string;
  onNext: (data: SchoolSetupData) => Promise<void>;
  isLoading: boolean;
}

const SCHOOL_TYPES = [
  { value: 'independent', label: 'Independent Teacher' },
  { value: 'private', label: 'Private School' },
  { value: 'government', label: 'Government School' },
] as const;

export function SchoolSetupStep({ defaultName, onNext, isLoading }: SchoolSetupStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolSetupData>({
    resolver: zodResolver(schoolSetupSchema),
    defaultValues: { name: defaultName, type: 'independent', province: '' },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Building2 className="h-4 w-4 text-[#2563EB]" />
        School / Classroom Details
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            School / Classroom Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. Mrs Smith's Grade 4"
            {...register('name')}
            aria-invalid={!!errors.name}
            className="h-10"
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">
              School Type <span className="text-destructive">*</span>
            </Label>
            <select
              id="type"
              {...register('type')}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {SCHOOL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">
              Province <span className="text-destructive">*</span>
            </Label>
            <select
              id="province"
              {...register('province')}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select province</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.province && (
              <p className="text-xs text-destructive">{errors.province.message}</p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="h-10 w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Next: Add Grades & Subjects'
        )}
      </Button>
    </form>
  );
}

export type { SchoolSetupData };
