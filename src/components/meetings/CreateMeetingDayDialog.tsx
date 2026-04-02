'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { CreateMeetingDayPayload } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  slotDuration: z.number().int().min(5, 'Duration must be at least 5 min'),
  location: z.string().optional(),
  virtualMeetingEnabled: z.boolean().optional(),
}).refine((d) => d.endTime > d.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMeetingDayPayload) => Promise<unknown>;
}

export function CreateMeetingDayDialog({ open, onOpenChange, onSubmit }: Props) {
  const {
    register, handleSubmit, setValue, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      slotDuration: 15,
      virtualMeetingEnabled: false,
    },
  });

  useEffect(() => {
    if (open) reset({ slotDuration: 15, virtualMeetingEnabled: false, name: '', date: '', startTime: '', endTime: '', location: '' });
  }, [open, reset]);

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to create meeting day';
      toast.error(msg);
    }
  };

  const virtualEnabled = watch('virtualMeetingEnabled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />New Meeting Day
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Meeting Day</DialogTitle>
          <DialogDescription>Set up a new parent-teacher meeting day.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input {...register('name')} placeholder="e.g. Term 1 Parent Meetings" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time <span className="text-destructive">*</span></Label>
                <Input type="time" {...register('startTime')} />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>End Time <span className="text-destructive">*</span></Label>
                <Input type="time" {...register('endTime')} />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Slot Duration <span className="text-destructive">*</span></Label>
              <Select defaultValue="15" onValueChange={(val: unknown) => setValue('slotDuration', Number(val))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...register('location')} placeholder="e.g. School Hall" />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={virtualEnabled ?? false}
                onCheckedChange={(checked: boolean) => setValue('virtualMeetingEnabled', checked)}
              />
              <Label>Enable virtual meetings</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
