'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SA_PROVINCES } from '@/lib/constants';

const schoolSetupSchema = z.object({
  name: z.string().min(2, 'School name is required'),
  type: z.string().min(1, 'School type is required'),
  province: z.string().min(1, 'Province is required'),
});

type SchoolSetupData = z.infer<typeof schoolSetupSchema>;

interface SchoolSetupStepProps {
  defaultName: string;
  formId: string;
  onNext: (data: SchoolSetupData) => Promise<void>;
}

const SCHOOL_TYPES = [
  { value: 'independent', label: 'Independent Teacher' },
  { value: 'private', label: 'Private School' },
  { value: 'government', label: 'Government School' },
] as const;

const selectTriggerClassName =
  'h-10 w-full justify-between bg-background text-foreground dark:bg-input/30 dark:text-white dark:hover:bg-input/40';

const selectContentClassName =
  'bg-popover text-popover-foreground dark:bg-[#111111] dark:text-white';

const selectItemClassName =
  'py-2 text-foreground data-[highlighted]:bg-[#2563EB] data-[highlighted]:text-white data-[selected]:bg-[#2563EB] data-[selected]:text-white dark:text-white';

export function SchoolSetupStep({ defaultName, formId, onNext }: SchoolSetupStepProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolSetupData>({
    resolver: zodResolver(schoolSetupSchema),
    defaultValues: { name: defaultName, type: 'independent', province: '' },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onNext)} className="space-y-6">
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
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(value: string | null) => field.onChange(value ?? '')}
                >
                  <SelectTrigger
                    id="type"
                    className={selectTriggerClassName}
                    aria-invalid={!!errors.type}
                  >
                    <SelectValue placeholder="Select school type" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {SCHOOL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className={selectItemClassName}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">
              Province <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="province"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(value: string | null) => field.onChange(value ?? '')}
                >
                  <SelectTrigger
                    id="province"
                    className={selectTriggerClassName}
                    aria-invalid={!!errors.province}
                  >
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {SA_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p} className={selectItemClassName}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.province && (
              <p className="text-xs text-destructive">{errors.province.message}</p>
            )}
          </div>
        </div>
      </div>

    </form>
  );
}

export type { SchoolSetupData };
