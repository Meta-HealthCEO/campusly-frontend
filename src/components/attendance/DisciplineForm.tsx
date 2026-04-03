'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Student } from '@/types';

const INCIDENT_TYPES = [
  'misconduct', 'bullying', 'vandalism', 'truancy', 'dress_code', 'late', 'other',
] as const;

const SEVERITIES = ['minor', 'moderate', 'serious', 'critical'] as const;

const OUTCOMES = [
  'warning', 'detention', 'suspension', 'expulsion', 'counselling', 'community_service',
] as const;

const disciplineFormSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  type: z.enum(INCIDENT_TYPES, { error: 'Type is required' }),
  severity: z.enum(SEVERITIES, { error: 'Severity is required' }),
  description: z.string().min(1, 'Description is required'),
  actionTaken: z.string().optional(),
  outcome: z.enum(OUTCOMES).optional(),
  parentNotified: z.boolean().optional(),
});

type DisciplineFormValues = z.infer<typeof disciplineFormSchema>;

interface DisciplineFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  onSubmit: (data: DisciplineFormValues) => void;
}

export function DisciplineForm({ open, onOpenChange, students, onSubmit }: DisciplineFormProps) {
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<DisciplineFormValues>({
    resolver: zodResolver(disciplineFormSchema),
  });

  const handleFormSubmit = (data: DisciplineFormValues) => {
    onSubmit(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Discipline Incident</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select onValueChange={(val: unknown) => setValue('studentId', val as string)}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.user?.firstName ?? s.firstName} {s.user?.lastName ?? s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(val: unknown) => setValue('type', val as DisciplineFormValues['type'])}>
                <SelectTrigger><SelectValue placeholder="Incident type" /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select onValueChange={(val: unknown) => setValue('severity', val as DisciplineFormValues['severity'])}>
                <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.severity && <p className="text-xs text-destructive">{errors.severity.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Describe the incident..." {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionTaken">Action Taken</Label>
            <Input id="actionTaken" placeholder="e.g., Verbal warning" {...register('actionTaken')} />
          </div>

          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select onValueChange={(val: unknown) => setValue('outcome', val as DisciplineFormValues['outcome'])}>
              <SelectTrigger><SelectValue placeholder="Select outcome (optional)" /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>{o.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Record</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
