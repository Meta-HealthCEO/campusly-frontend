'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import type { SchoolClass } from '@/types';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
}

const substituteSchema = z.object({
  originalTeacherId: z.string().min(1, 'Original teacher is required'),
  substituteTeacherId: z.string().min(1, 'Substitute teacher is required'),
  date: z.string().min(1, 'Date is required'),
  reason: z.string().min(1, 'Reason is required'),
});

type SubstituteFormValues = z.infer<typeof substituteSchema>;

interface SubstituteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  classes: SchoolClass[];
  onSubmit: (data: {
    originalTeacherId: string;
    substituteTeacherId: string;
    date: string;
    reason: string;
    periods: number[];
    classIds: string[];
  }) => void;
}

const ALL_PERIODS = [1, 2, 3, 4, 5, 6];

export function SubstituteForm({
  open, onOpenChange, staff, classes, onSubmit,
}: SubstituteFormProps) {
  const {
    register, handleSubmit, setValue, reset, formState: { errors },
  } = useForm<SubstituteFormValues>({
    resolver: zodResolver(substituteSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  });

  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [periodError, setPeriodError] = useState('');
  const [classError, setClassError] = useState('');

  const togglePeriod = (p: number) => {
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
    setPeriodError('');
  };

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setClassError('');
  };

  const handleFormSubmit = (data: SubstituteFormValues) => {
    if (selectedPeriods.length === 0) {
      setPeriodError('At least one period is required');
      return;
    }
    if (selectedClasses.length === 0) {
      setClassError('At least one class is required');
      return;
    }
    onSubmit({
      ...data,
      date: new Date(data.date).toISOString(),
      periods: selectedPeriods.sort(),
      classIds: selectedClasses,
    });
    reset();
    setSelectedPeriods([]);
    setSelectedClasses([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Substitute Teacher</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Original Teacher</Label>
            <Select onValueChange={(val: unknown) => setValue('originalTeacherId', val as string)}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.originalTeacherId && (
              <p className="text-xs text-destructive">{errors.originalTeacherId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Substitute Teacher</Label>
            <Select onValueChange={(val: unknown) => setValue('substituteTeacherId', val as string)}>
              <SelectTrigger><SelectValue placeholder="Select substitute" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.substituteTeacherId && (
              <p className="text-xs text-destructive">{errors.substituteTeacherId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-date">Date</Label>
            <Input id="sub-date" type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Periods</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_PERIODS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={selectedPeriods.includes(p)}
                    onCheckedChange={() => togglePeriod(p)}
                  />
                  Period {p}
                </label>
              ))}
            </div>
            {periodError && <p className="text-xs text-destructive">{periodError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Classes</Label>
            <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={selectedClasses.includes(c.id)}
                    onCheckedChange={() => toggleClass(c.id)}
                  />
                  {c.grade?.name ?? c.gradeName ?? ''} {c.name}
                </label>
              ))}
            </div>
            {classError && <p className="text-xs text-destructive">{classError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" placeholder="e.g., Teacher ill" {...register('reason')} />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Assign Substitute</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
