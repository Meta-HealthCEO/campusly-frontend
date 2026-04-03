'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PlusIcon, MinusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { CreateClassroomSessionPayload } from '@/types';

interface FormValues {
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  scheduledStart: string;
  scheduledEnd: string;
  isRecorded: boolean;
  studentVideoEnabled: boolean;
  studentAudioEnabled: boolean;
  chatEnabled: boolean;
  maxParticipants: number;
  recurringRule: string;
}

interface SessionSchedulerProps {
  onSubmit: (data: CreateClassroomSessionPayload) => Promise<void>;
}

export function SessionScheduler({ onSubmit }: SessionSchedulerProps) {
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: '', description: '', subjectId: '', classId: '',
      scheduledStart: '', scheduledEnd: '', recurringRule: '',
      isRecorded: false,
      studentVideoEnabled: true,
      studentAudioEnabled: true,
      chatEnabled: true,
      maxParticipants: 30,
    },
  });

  const isRecorded = watch('isRecorded');
  const studentVideoEnabled = watch('studentVideoEnabled');
  const studentAudioEnabled = watch('studentAudioEnabled');
  const chatEnabled = watch('chatEnabled');

  async function handleFormSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const payload: CreateClassroomSessionPayload = {
        title: values.title,
        description: values.description,
        subjectId: values.subjectId,
        classId: values.classId,
        scheduledStart: new Date(values.scheduledStart).toISOString(),
        scheduledEnd: new Date(values.scheduledEnd).toISOString(),
        isRecorded: values.isRecorded,
        recurringRule: values.recurringRule === 'none' ? undefined : values.recurringRule,
        settings: {
          studentVideoEnabled: values.studentVideoEnabled,
          studentAudioEnabled: values.studentAudioEnabled,
          chatEnabled: values.chatEnabled,
          maxParticipants: values.maxParticipants,
        },
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Schedule New Session</DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto py-4">
        <form id="session-scheduler-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input id="title" {...register('title')} placeholder="e.g. Introduction to Algebra" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="Optional session description" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="subjectId">Subject ID <span className="text-destructive">*</span></Label>
              <Input id="subjectId" {...register('subjectId')} placeholder="Subject ID" />
              {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="classId">Class ID <span className="text-destructive">*</span></Label>
              <Input id="classId" {...register('classId')} placeholder="Class ID" />
              {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="scheduledStart">Start <span className="text-destructive">*</span></Label>
              <Input id="scheduledStart" type="datetime-local" {...register('scheduledStart')} />
              {errors.scheduledStart && <p className="text-xs text-destructive">{errors.scheduledStart.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="scheduledEnd">End <span className="text-destructive">*</span></Label>
              <Input id="scheduledEnd" type="datetime-local" {...register('scheduledEnd')} />
              {errors.scheduledEnd && <p className="text-xs text-destructive">{errors.scheduledEnd.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="isRecorded" className="cursor-pointer">Record session</Label>
            <Switch
              id="isRecorded"
              checked={!!isRecorded}
              onCheckedChange={(val: boolean) => setValue('isRecorded', val)}
            />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Session Settings</p>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-sm font-normal">Student video enabled</Label>
              <Switch
                checked={!!studentVideoEnabled}
                onCheckedChange={(val: boolean) => setValue('studentVideoEnabled', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-sm font-normal">Student audio enabled</Label>
              <Switch
                checked={!!studentAudioEnabled}
                onCheckedChange={(val: boolean) => setValue('studentAudioEnabled', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-sm font-normal">Chat enabled</Label>
              <Switch
                checked={!!chatEnabled}
                onCheckedChange={(val: boolean) => setValue('chatEnabled', val)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="maxParticipants" className="text-sm font-normal">Max participants</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    const cur = watch('maxParticipants') ?? 30;
                    if (cur > 1) setValue('maxParticipants', cur - 1);
                  }}
                >
                  <MinusIcon className="size-3" />
                </Button>
                <Input
                  id="maxParticipants"
                  type="number"
                  className="w-16 text-center"
                  {...register('maxParticipants')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setValue('maxParticipants', (watch('maxParticipants') ?? 30) + 1)}
                >
                  <PlusIcon className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Recurring Rule</Label>
            <Select defaultValue="none" onValueChange={(val: unknown) => setValue('recurringRule', val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No recurrence</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </div>

      <DialogFooter>
        <Button type="submit" form="session-scheduler-form" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? 'Scheduling…' : 'Schedule Session'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
