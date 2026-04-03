'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { CreateSessionPayload, PastoralSessionType, ConfidentialityLevel } from '@/types';

const schema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  referralId: z.string().optional(),
  sessionDate: z.string().min(1, 'Date is required'),
  sessionType: z.enum(['individual', 'group', 'crisis', 'follow_up', 'consultation'], { error: 'Session type is required' }),
  duration: z.number().min(5, 'Min 5 min').max(180, 'Max 180 min'),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  followUpActions: z.string().optional(),
  followUpDate: z.string().optional(),
  confidentialityLevel: z.enum(['standard', 'sensitive', 'restricted'], { error: 'Confidentiality level is required' }),
  notifyParent: z.boolean().optional(),
  parentNotificationMessage: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSessionPayload) => Promise<void>;
}

const SESSION_TYPES: { value: PastoralSessionType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
  { value: 'crisis', label: 'Crisis' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'consultation', label: 'Consultation' },
];

const CONFIDENTIALITY: { value: ConfidentialityLevel; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Accessible to authorised staff' },
  { value: 'sensitive', label: 'Sensitive', description: 'Counselor and principal only' },
  { value: 'restricted', label: 'Restricted', description: 'Counselor eyes only' },
];

export function SessionCreateDialog({ open, onOpenChange, onSubmit }: Props) {
  const {
    register, handleSubmit, setValue, watch, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { duration: 45, notifyParent: false },
  });

  const notifyParent = watch('notifyParent');

  useEffect(() => {
    if (open) reset({ duration: 45, notifyParent: false });
  }, [open, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data as CreateSessionPayload);
      toast.success('Session logged successfully');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to log session';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Session</DialogTitle>
          <DialogDescription>Record a pastoral counseling session.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          <form id="session-create-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="studentId">Student ID <span className="text-destructive">*</span></Label>
                <Input id="studentId" {...register('studentId')} placeholder="Student ID" />
                {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="referralId">Referral ID (optional)</Label>
                <Input id="referralId" {...register('referralId')} placeholder="Linked referral ID" />
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sessionDate">Session Date <span className="text-destructive">*</span></Label>
                <Input id="sessionDate" type="date" {...register('sessionDate')} />
                {errors.sessionDate && <p className="text-xs text-destructive">{errors.sessionDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="duration">Duration (min) <span className="text-destructive">*</span></Label>
                <Input id="duration" type="number" min={5} max={180} {...register('duration', { valueAsNumber: true })} />
                {errors.duration && <p className="text-xs text-destructive">{errors.duration.message}</p>}
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Session Type <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val: unknown) => setValue('sessionType', val as PastoralSessionType)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sessionType && <p className="text-xs text-destructive">{errors.sessionType.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Confidentiality <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val: unknown) => setValue('confidentialityLevel', val as ConfidentialityLevel)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {CONFIDENTIALITY.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="font-medium">{c.label}</span>
                        <span className="ml-1 text-xs text-muted-foreground">— {c.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.confidentialityLevel && <p className="text-xs text-destructive">{errors.confidentialityLevel.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="summary">Session Summary <span className="text-destructive">*</span></Label>
              <Textarea id="summary" {...register('summary')} placeholder="Summary of the session (min 10 characters)..." rows={3} />
              {errors.summary && <p className="text-xs text-destructive">{errors.summary.message}</p>}
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="followUpActions">Follow-Up Actions (optional)</Label>
                <Textarea id="followUpActions" {...register('followUpActions')} placeholder="Actions to take..." rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followUpDate">Follow-Up Date (optional)</Label>
                <Input id="followUpDate" type="date" {...register('followUpDate')} />
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
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
              {notifyParent && (
                <div className="space-y-1">
                  <Label htmlFor="parentNotificationMessage">Parent Message</Label>
                  <Textarea
                    id="parentNotificationMessage"
                    {...register('parentNotificationMessage')}
                    placeholder="Message to send to parent..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="session-create-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Log Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
