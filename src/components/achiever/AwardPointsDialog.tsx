'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { StudentSelector } from '@/components/fees/StudentSelector';
import type { AwardHousePointsInput, ApiHousePoints } from '@/hooks/useAchiever';

const schema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  points: z.number({ error: 'Points required' }),
  reason: z.string().min(1, 'Reason is required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: ApiHousePoints | null;
  onSubmit: (data: AwardHousePointsInput) => Promise<void>;
}

export function AwardPointsDialog({ open, onOpenChange, house, onSubmit }: Props) {
  const [studentId, setStudentId] = useState('');

  const {
    register, handleSubmit, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { points: 10 } });

  const handleFormSubmit = async (data: FormData) => {
    if (!house) return;
    try {
      await onSubmit({ ...data, studentId, houseId: house._id });
      toast.success(`${data.points >= 0 ? 'Awarded' : 'Deducted'} ${Math.abs(data.points)} points`);
      reset({ points: 10, reason: '', studentId: '' });
      setStudentId('');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to award house points';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Award Points</DialogTitle>
          <DialogDescription>
            Award points to{' '}
            <span style={{ color: house?.houseColor }} className="font-semibold">{house?.houseName}</span>.
            Use negative values for deductions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <StudentSelector
            value={studentId}
            onValueChange={(v: unknown) => { setStudentId(v as string); setValue('studentId', v as string); }}
          />
          {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}

          <div className="space-y-2">
            <Label>Points</Label>
            <Input type="number" {...register('points', { valueAsNumber: true })} placeholder="10" />
            <p className="text-xs text-muted-foreground">Use negative numbers for deductions</p>
            {errors.points && <p className="text-xs text-destructive">{errors.points.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea {...register('reason')} placeholder="Reason for awarding points..." rows={2} />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Awarding...' : 'Award'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
