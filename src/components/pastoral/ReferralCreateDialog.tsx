'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { CreateReferralPayload, ReferralReason, ReferralUrgency } from '@/types';

const schema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  reason: z.enum(['academic', 'behavioural', 'emotional', 'social', 'family', 'substance', 'bullying', 'self_harm', 'other'], { error: 'Reason is required' }),
  urgency: z.enum(['low', 'medium', 'high', 'critical'], { error: 'Urgency is required' }),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  referrerNotes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateReferralPayload) => Promise<void>;
}

const REASONS: { value: ReferralReason; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'behavioural', label: 'Behavioural' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'social', label: 'Social' },
  { value: 'family', label: 'Family' },
  { value: 'substance', label: 'Substance' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'self_harm', label: 'Self Harm' },
  { value: 'other', label: 'Other' },
];

const URGENCIES: { value: ReferralUrgency; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function ReferralCreateDialog({ open, onOpenChange, onSubmit }: Props) {
  const {
    register, handleSubmit, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data as CreateReferralPayload);
      toast.success('Referral submitted successfully');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to submit referral';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Referral</DialogTitle>
          <DialogDescription>Refer a student to the counselor for pastoral support.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          <form id="referral-create-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="studentId">Student ID <span className="text-destructive">*</span></Label>
              <Input id="studentId" {...register('studentId')} placeholder="Enter student ID" />
              {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val: unknown) => setValue('reason', val as ReferralReason)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Urgency <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val: unknown) => setValue('urgency', val as ReferralUrgency)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select urgency" /></SelectTrigger>
                  <SelectContent>
                    {URGENCIES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.urgency && <p className="text-xs text-destructive">{errors.urgency.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
              <Textarea id="description" {...register('description')} placeholder="Describe the concern (min 10 characters)..." rows={3} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="referrerNotes">Referrer Notes (optional)</Label>
              <Textarea id="referrerNotes" {...register('referrerNotes')} placeholder="Any additional notes for the counselor..." rows={2} />
            </div>
          </form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="referral-create-form" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
