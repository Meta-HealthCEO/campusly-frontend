'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { SchoolDocument, UpdateSettingsInput } from '@/types';

// z.coerce.number() schema — coercion is handled via valueAsNumber on the inputs.
// z.number() is used here so FieldValues types resolve correctly with react-hook-form.
const settingsSchema = z.object({
  academicYear: z.number().int().positive('Academic year is required'),
  terms: z.number().int().min(1).max(6, 'Max 6 terms'),
  gradingSystem: z.enum(['percentage', 'letter', 'gpa']),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SchoolSettingsFormProps {
  school: SchoolDocument;
  onSave: (data: UpdateSettingsInput) => Promise<void>;
}

export function SchoolSettingsForm({ school, onSave }: SchoolSettingsFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      academicYear: school.settings.academicYear,
      terms: school.settings.terms,
      gradingSystem: school.settings.gradingSystem,
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await onSave(data);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Settings</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="academicYear">Academic Year</Label>
            <Input
              id="academicYear"
              type="number"
              {...register('academicYear', { valueAsNumber: true })}
              placeholder="e.g. 2026"
            />
            {errors.academicYear && (
              <p className="text-xs text-destructive">{errors.academicYear.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Number of Terms</Label>
            <Input
              id="terms"
              type="number"
              {...register('terms', { valueAsNumber: true })}
              placeholder="e.g. 4"
              min={1}
              max={6}
            />
            {errors.terms && (
              <p className="text-xs text-destructive">{errors.terms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Grading System</Label>
            <Select
              defaultValue={school.settings.gradingSystem}
              onValueChange={(val: unknown) =>
                setValue('gradingSystem', val as SettingsFormData['gradingSystem'])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select grading system" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="gpa">GPA</SelectItem>
              </SelectContent>
            </Select>
            {errors.gradingSystem && (
              <p className="text-xs text-destructive">{errors.gradingSystem.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
