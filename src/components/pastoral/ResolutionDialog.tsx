'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { PastoralReferral, ResolveReferralPayload, ReferralOutcome } from '@/types';

const schema = z.object({
  outcome: z.enum(['positive', 'ongoing', 'referred_external', 'no_further_action'], { error: 'Outcome is required' }),
  resolutionNotes: z.string().min(1, 'Resolution notes are required'),
  status: z.enum(['resolved', 'closed']),
  notifyReferrer: z.boolean().optional(),
  notifyParent: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: PastoralReferral | null;
  onSubmit: (id: string, data: ResolveReferralPayload) => Promise<void>;
}

const OUTCOMES: { value: ReferralOutcome; label: string }[] = [
  { value: 'positive', label: 'Positive Outcome' },
  { value: 'ongoing', label: 'Ongoing Support' },
  { value: 'referred_external', label: 'Referred Externally' },
  { value: 'no_further_action', label: 'No Further Action' },
];

export function ResolutionDialog({ open, onOpenChange, referral, onSubmit }: Props) {
  const {
    register, handleSubmit, setValue, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'resolved', notifyReferrer: false, notifyParent: false },
  });

  useEffect(() => {
    if (open) reset({ status: 'resolved', notifyReferrer: false, notifyParent: false });
  }, [open, reset]);

  const handleFormSubmit = async (data: FormData) => {
    if (!referral) return;
    try {
      await onSubmit(referral.id, data as ResolveReferralPayload);
      toast.success('Referral resolved successfully');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to resolve referral';
      toast.error(msg);
    }
  };

  const studentName = referral
    ? `${referral.studentId.firstName} ${referral.studentId.lastName}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Referral</DialogTitle>
          <DialogDescription>
            {studentName ? `Resolve the referral for ${studentName}.` : 'Record the outcome for this referral.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          <form id="resolution-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Outcome <span className="text-destructive">*</span></Label>
              <Select onValueChange={(val: unknown) => setValue('outcome', val as ReferralOutcome)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.outcome && <p className="text-xs text-destructive">{errors.outcome.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="resolutionNotes">Resolution Notes <span className="text-destructive">*</span></Label>
              <Textarea id="resolutionNotes" {...register('resolutionNotes')} placeholder="Summarise the resolution..." rows={3} />
              {errors.resolutionNotes && <p className="text-xs text-destructive">{errors.resolutionNotes.message}</p>}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notifications</p>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Notify Referrer</Label>
                <Controller
                  name="notifyReferrer"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Notify Parent / Guardian</Label>
                <Controller
                  name="notifyParent"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>
          </form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="resolution-form" disabled={isSubmitting || !referral}>
            {isSubmitting ? 'Resolving...' : 'Resolve Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
