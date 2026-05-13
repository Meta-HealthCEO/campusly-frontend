'use client';

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Grade } from '@/types';

const studentRowSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gradeId: z.string().min(1, 'Grade is required'),
});

type StudentRow = z.infer<typeof studentRowSchema>;

export interface PendingStudent {
  firstName: string;
  lastName: string;
  gradeId: string;
  gradeName: string;
}

interface AddStudentsStepProps {
  grades: Grade[];
  pendingStudents: PendingStudent[];
  onPendingChange: (next: PendingStudent[]) => void;
  csvText: string;
  onCsvTextChange: (next: string) => void;
  showCsv: boolean;
  onShowCsvToggle: () => void;
}

const nativeSelectClassName =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:[&>option]:bg-card dark:[&>option]:text-card-foreground';

export function AddStudentsStep({
  grades,
  pendingStudents,
  onPendingChange,
  csvText,
  onCsvTextChange,
  showCsv,
  onShowCsvToggle,
}: AddStudentsStepProps) {
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<StudentRow>({
    resolver: zodResolver(studentRowSchema),
    defaultValues: { firstName: '', lastName: '', gradeId: '' },
  });

  const addStudent = (data: StudentRow) => {
    const grade = grades.find((g) => g.id === data.gradeId);
    onPendingChange([...pendingStudents, { ...data, gradeName: grade?.name ?? data.gradeId }]);
    reset();
  };

  const removeStudent = (index: number) => {
    onPendingChange(pendingStudents.filter((_, i) => i !== index));
  };

  const parseCsv = useCallback(() => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const parsed: PendingStudent[] = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 3) continue;
      const [firstName, lastName, gradeName] = parts;
      const grade = grades.find(
        (g) => g.name.toLowerCase() === (gradeName ?? '').toLowerCase(),
      );
      if (!grade) continue;
      parsed.push({ firstName: firstName ?? '', lastName: lastName ?? '', gradeId: grade.id, gradeName: grade.name });
    }

    if (parsed.length === 0) {
      toast.error('No valid rows found. Format: First Name, Last Name, Grade');
      return;
    }

    onPendingChange([...pendingStudents, ...parsed]);
    onCsvTextChange('');
    toast.success(`${parsed.length} student(s) parsed from CSV`);
  }, [csvText, grades, pendingStudents, onPendingChange, onCsvTextChange]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <UserPlus className="h-4 w-4 text-[#2563EB]" />
        Add Students (Optional)
      </div>

      {/* Quick add form */}
      <form onSubmit={handleSubmit(addStudent)} className="space-y-3">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" placeholder="First name" {...register('firstName')} className="h-9" />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" placeholder="Last name" {...register('lastName')} className="h-9" />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="gradeId">Grade</Label>
            <select
              id="gradeId"
              {...register('gradeId')}
              onChange={(e) => setValue('gradeId', e.target.value)}
              className={nativeSelectClassName}
            >
              <option value="">Select grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {errors.gradeId && <p className="text-xs text-destructive">{errors.gradeId.message}</p>}
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-8">
          <UserPlus className="mr-1 h-3 w-3" /> Add Student
        </Button>
      </form>

      {/* CSV toggle */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onShowCsvToggle}
          className="h-8 text-xs"
        >
          <Upload className="mr-1 h-3 w-3" /> {showCsv ? 'Hide' : 'Paste'} CSV
        </Button>
        {showCsv && (
          <div className="mt-2 space-y-2">
            <textarea
              value={csvText}
              onChange={(e) => onCsvTextChange(e.target.value)}
              rows={4}
              placeholder="First Name, Last Name, Grade&#10;John, Smith, Grade 4&#10;Jane, Doe, Grade 5"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring"
            />
            <Button type="button" variant="outline" size="sm" onClick={parseCsv} className="h-8">
              Parse CSV
            </Button>
          </div>
        )}
      </div>

      {/* Pending list */}
      {pendingStudents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{pendingStudents.length} student(s) ready to add:</p>
          <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
            {pendingStudents.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">{s.firstName} {s.lastName} — {s.gradeName}</span>
                <button type="button" onClick={() => removeStudent(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
