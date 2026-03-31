'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useGrades, useClasses } from '@/hooks/useAcademics';
import type {
  AnnouncementAudience,
  AnnouncementPriority,
  CreateAnnouncementInput,
} from '@/hooks/useAnnouncements';

type FormValues = {
  title: string;
  content: string;
  targetAudience: AnnouncementAudience;
  targetId: string;
  priority: AnnouncementPriority;
  expiresAt: string;
  scheduledPublishDate: string;
  attachmentUrl: string;
  pinned: boolean;
};

interface AnnouncementFormProps {
  defaultValues?: Partial<CreateAnnouncementInput>;
  onSubmit: (data: Omit<CreateAnnouncementInput, 'schoolId'>) => void | Promise<void>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const audienceOptions: { value: AnnouncementAudience; label: string }[] = [
  { value: 'all', label: 'All (Whole School)' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents', label: 'Parents' },
  { value: 'students', label: 'Students' },
  { value: 'grade', label: 'Specific Grade' },
  { value: 'class', label: 'Specific Class' },
];

const priorityOptions: { value: AnnouncementPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function AnnouncementForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  mode = 'create',
}: AnnouncementFormProps) {
  const { grades } = useGrades();
  const [selectedAudience, setSelectedAudience] = useState<AnnouncementAudience>(
    defaultValues?.targetAudience ?? 'all',
  );
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const { classes } = useClasses(selectedAudience === 'class' ? selectedGradeId : undefined);

  const {
    register, handleSubmit, setValue, watch, formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: defaultValues?.title ?? '',
      content: defaultValues?.content ?? '',
      targetAudience: defaultValues?.targetAudience ?? 'all',
      targetId: defaultValues?.targetId ?? '',
      priority: defaultValues?.priority ?? 'medium',
      expiresAt: defaultValues?.expiresAt ? defaultValues.expiresAt.slice(0, 16) : '',
      scheduledPublishDate: defaultValues?.scheduledPublishDate
        ? defaultValues.scheduledPublishDate.slice(0, 16)
        : '',
      attachmentUrl: defaultValues?.attachments?.[0] ?? '',
      pinned: defaultValues?.pinned ?? false,
    },
  });

  const pinnedVal = watch('pinned');

  useEffect(() => {
    if (defaultValues?.targetAudience === 'grade' || defaultValues?.targetAudience === 'class') {
      setSelectedAudience(defaultValues.targetAudience);
    }
  }, [defaultValues?.targetAudience]);

  const handleFormSubmit = (values: FormValues) => {
    const payload: Omit<CreateAnnouncementInput, 'schoolId'> = {
      title: values.title,
      content: values.content,
      targetAudience: values.targetAudience,
      priority: values.priority,
      pinned: values.pinned,
    };
    if (values.targetId && (values.targetAudience === 'grade' || values.targetAudience === 'class')) {
      payload.targetId = values.targetId;
    }
    if (values.expiresAt) {
      payload.expiresAt = new Date(values.expiresAt).toISOString();
    }
    if (values.scheduledPublishDate) {
      payload.scheduledPublishDate = new Date(values.scheduledPublishDate).toISOString();
    }
    if (values.attachmentUrl) {
      payload.attachments = [values.attachmentUrl];
    }
    onSubmit(payload);
  };

  const needsTargetId = selectedAudience === 'grade' || selectedAudience === 'class';

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" placeholder="Announcement title" {...register('title', { required: 'Title is required' })} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content *</Label>
        <Textarea id="content" placeholder="Write your announcement..." rows={4} {...register('content', { required: 'Content is required' })} />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Target Audience *</Label>
          <Select
            defaultValue={defaultValues?.targetAudience ?? 'all'}
            onValueChange={(val: unknown) => {
              const audience = val as AnnouncementAudience;
              setValue('targetAudience', audience);
              setSelectedAudience(audience);
              setValue('targetId', '');
              setSelectedGradeId('');
            }}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Select audience" /></SelectTrigger>
            <SelectContent>
              {audienceOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            defaultValue={defaultValues?.priority ?? 'medium'}
            onValueChange={(val: unknown) => setValue('priority', val as AnnouncementPriority)}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Select priority" /></SelectTrigger>
            <SelectContent>
              {priorityOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {needsTargetId && selectedAudience === 'grade' && (
        <div className="space-y-2">
          <Label>Select Grade *</Label>
          <Select
            onValueChange={(val: unknown) => setValue('targetId', val as string)}
            defaultValue={defaultValues?.targetId ?? ''}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Choose a grade" /></SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {needsTargetId && selectedAudience === 'class' && (
        <div className="space-y-2">
          <Label>Select Grade (to filter classes)</Label>
          <Select
            onValueChange={(val: unknown) => setSelectedGradeId(val as string)}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Choose a grade" /></SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label>Select Class *</Label>
          <Select
            onValueChange={(val: unknown) => setValue('targetId', val as string)}
            defaultValue={defaultValues?.targetId ?? ''}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Choose a class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expires At</Label>
          <Input id="expiresAt" type="datetime-local" {...register('expiresAt')} />
        </div>
        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="scheduledPublishDate">Scheduled Publish Date</Label>
            <Input id="scheduledPublishDate" type="datetime-local" {...register('scheduledPublishDate')} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachmentUrl">Attachment URL</Label>
        <Input id="attachmentUrl" placeholder="https://..." {...register('attachmentUrl')} />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={pinnedVal}
          onCheckedChange={(checked: boolean) => setValue('pinned', checked)}
        />
        <Label>Pin to top</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Announcement' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
