'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { School, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GRADE_LEVELS } from '@/lib/constants';

interface CreateClassFormData {
  gradeName: string;
  className: string;
  capacity: number;
}

interface CreateClassStepProps {
  onNext: (data: CreateClassFormData) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function CreateClassStep({ onNext, onBack, isLoading }: CreateClassStepProps) {
  const [gradeError, setGradeError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateClassFormData>({
    defaultValues: { gradeName: '', className: '', capacity: 35 },
  });

  const onSubmit = (data: CreateClassFormData) => {
    if (!data.gradeName) {
      setGradeError('Grade is required');
      return;
    }
    setGradeError(null);
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <School className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Create your first class</h2>
        <p className="text-sm text-muted-foreground">
          Set up a class so you can start adding students.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="gradeName">
            Grade <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(val: unknown) => {
              setValue('gradeName', val as string);
              setGradeError(null);
            }}
            value={getValues('gradeName') || undefined}
          >
            <SelectTrigger id="gradeName" className="w-full">
              <SelectValue placeholder="Select a grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gradeError && <p className="text-xs text-destructive">{gradeError}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="className">
            Class name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="className"
            placeholder="e.g. 4A, Blue Group"
            {...register('className', { required: 'Class name is required' })}
          />
          {errors.className && (
            <p className="text-xs text-destructive">{errors.className.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={200}
            {...register('capacity', { valueAsNumber: true })}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full sm:flex-1">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create class
          </Button>
        </div>
      </form>
    </div>
  );
}
