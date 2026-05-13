'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PlusIcon, MinusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { resolveId } from '@/lib/api-helpers';
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
  const [teachingGroup, setTeachingGroup] = useState('');
  const { entries, loading: loadingClasses } = useTeacherClasses();

  const teachingOptions = useMemo(() => {
    return entries
      .filter((entry) => entry.subject)
      .map((entry) => {
        const classId = resolveId(entry.class);
        const subjectId = entry.subject?.id ?? '';
        return {
          value: `${classId}:${subjectId}`,
          classId,
          subjectId,
          label: `${entry.class.name} - ${entry.subject?.name ?? 'Subject'}`,
        };
      })
      .filter((option) => option.classId && option.subjectId);
  }, [entries]);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      subjectId: '',
      classId: '',
      scheduledStart: '',
      scheduledEnd: '',
      recurringRule: 'none',
      isRecorded: true,
      studentVideoEnabled: false,
      studentAudioEnabled: false,
      chatEnabled: true,
      maxParticipants: 30,
    },
  });

  const isRecorded = watch('isRecorded');
  const studentVideoEnabled = watch('studentVideoEnabled');
  const studentAudioEnabled = watch('studentAudioEnabled');
  const chatEnabled = watch('chatEnabled');

  function handleTeachingGroupChange(value: string | null) {
    if (!value) return;
    const option = teachingOptions.find((item) => item.value === value);
    setTeachingGroup(value);
    setValue('classId', option?.classId ?? '', { shouldValidate: true });
    setValue('subjectId', option?.subjectId ?? '', { shouldValidate: true });
  }

  async function handleFormSubmit(values: FormValues) {
    const start = new Date(values.scheduledStart);
    const end = new Date(values.scheduledEnd);

    if (!values.classId || !values.subjectId) {
      setError('classId', { type: 'validate', message: 'Select a class and subject' });
      return;
    }

    if (Number.isNaN(start.getTime())) {
      setError('scheduledStart', { type: 'validate', message: 'Start must be valid' });
      return;
    }

    if (Number.isNaN(end.getTime()) || end <= start) {
      setError('scheduledEnd', { type: 'validate', message: 'End must be after start' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateClassroomSessionPayload = {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        subjectId: values.subjectId,
        classId: values.classId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        isRecorded: values.isRecorded,
        recurringRule:
          values.recurringRule && values.recurringRule !== 'none'
            ? values.recurringRule
            : undefined,
        settings: {
          studentVideoEnabled: values.studentVideoEnabled,
          studentAudioEnabled: values.studentAudioEnabled,
          chatEnabled: values.chatEnabled,
          maxParticipants: values.maxParticipants,
          allowLateJoin: true,
        },
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = teachingOptions.length > 0 && !loadingClasses && !submitting;

  return (
    <div className="flex max-h-[75vh] flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        <form id="session-scheduler-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <input
            type="hidden"
            {...register('classId', { required: 'Select a class and subject' })}
          />
          <input
            type="hidden"
            {...register('subjectId', { required: 'Select a class and subject' })}
          />

          <div className="space-y-1">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 3, message: 'Title is too short' },
              })}
              placeholder="e.g. Introduction to Algebra"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="Optional session description" />
          </div>

          <div className="space-y-1">
            <Label>Class and subject <span className="text-destructive">*</span></Label>
            <Select
              value={teachingGroup}
              onValueChange={handleTeachingGroupChange}
              disabled={loadingClasses || teachingOptions.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingClasses ? 'Loading classes...' : 'Select class and subject'} />
              </SelectTrigger>
              <SelectContent>
                {teachingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(errors.classId || errors.subjectId) && (
              <p className="text-xs text-destructive">
                {errors.classId?.message ?? errors.subjectId?.message}
              </p>
            )}
            {!loadingClasses && teachingOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">No subject classes are assigned to your profile.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="scheduledStart">Start <span className="text-destructive">*</span></Label>
              <Input
                id="scheduledStart"
                type="datetime-local"
                {...register('scheduledStart', { required: 'Start is required' })}
              />
              {errors.scheduledStart && <p className="text-xs text-destructive">{errors.scheduledStart.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="scheduledEnd">End <span className="text-destructive">*</span></Label>
              <Input
                id="scheduledEnd"
                type="datetime-local"
                {...register('scheduledEnd', { required: 'End is required' })}
              />
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
                    const current = watch('maxParticipants') ?? 30;
                    if (current > 1) setValue('maxParticipants', current - 1, { shouldValidate: true });
                  }}
                  aria-label="Decrease max participants"
                >
                  <MinusIcon className="size-3" />
                </Button>
                <Input
                  id="maxParticipants"
                  type="number"
                  className="w-16 text-center"
                  {...register('maxParticipants', {
                    valueAsNumber: true,
                    min: { value: 1, message: 'Minimum is 1' },
                    max: { value: 500, message: 'Maximum is 500' },
                  })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    const current = watch('maxParticipants') ?? 30;
                    if (current < 500) setValue('maxParticipants', current + 1, { shouldValidate: true });
                  }}
                  aria-label="Increase max participants"
                >
                  <PlusIcon className="size-3" />
                </Button>
              </div>
            </div>
            {errors.maxParticipants && (
              <p className="text-xs text-destructive">{errors.maxParticipants.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Recurring Rule</Label>
            <Select
              defaultValue="none"
              onValueChange={(value: string | null) => {
                if (value) setValue('recurringRule', value);
              }}
            >
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

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" form="session-scheduler-form" disabled={!canSubmit} className="w-full sm:w-auto">
          {submitting ? 'Scheduling...' : 'Schedule Session'}
        </Button>
      </div>
    </div>
  );
}
