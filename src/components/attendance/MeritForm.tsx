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

const MERIT_CATEGORIES = [
  'academic', 'behaviour', 'sport', 'service', 'leadership',
] as const;

const meritFormSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  type: z.enum(['merit', 'demerit'], { error: 'Type is required' }),
  points: z.number().min(1, 'Points must be at least 1'),
  category: z.enum(MERIT_CATEGORIES, { error: 'Category is required' }),
  reason: z.string().min(1, 'Reason is required'),
});

type MeritFormValues = z.infer<typeof meritFormSchema>;

interface MeritFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  onSubmit: (data: MeritFormValues) => void;
}

export function MeritForm({ open, onOpenChange, students, onSubmit }: MeritFormProps) {
  const {
    register, handleSubmit, setValue, reset, watch, formState: { errors },
  } = useForm<MeritFormValues>({
    resolver: zodResolver(meritFormSchema),
    defaultValues: { type: 'merit', points: 5 },
  });

  const selectedType = watch('type');

  const handleFormSubmit = (data: MeritFormValues) => {
    onSubmit(data);
    reset({ type: 'merit', points: 5 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Award Merit / Demerit</DialogTitle>
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
              <Select value={selectedType} onValueChange={(val: unknown) => setValue('type', val as 'merit' | 'demerit')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="merit">Merit</SelectItem>
                  <SelectItem value="demerit">Demerit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input id="points" type="number" min={1} {...register('points', { valueAsNumber: true })} />
              {errors.points && <p className="text-xs text-destructive">{errors.points.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select onValueChange={(val: unknown) => setValue('category', val as MeritFormValues['category'])}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {MERIT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" placeholder="Describe the reason..." {...register('reason')} />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Award</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
