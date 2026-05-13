'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CreateVideoPayload, VideoLesson, VideoType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { resolveId } from '@/lib/api-helpers';

interface FormValues {
  title: string;
  description: string;
  videoUrl: string;
  videoType: VideoType;
  subjectId: string;
  classId: string;
  thumbnailUrl: string;
  durationSeconds: number;
  tags: string;
  isPublished: boolean;
}

interface VideoUploadFormProps {
  onSubmit: (data: CreateVideoPayload) => Promise<void>;
  video?: VideoLesson;
}

const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: 'upload', label: 'Upload' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'recording', label: 'Recording' },
];

export function VideoUploadForm({ onSubmit, video }: VideoUploadFormProps) {
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
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      videoUrl: '',
      videoType: 'upload',
      subjectId: '',
      classId: '',
      thumbnailUrl: '',
      durationSeconds: 0,
      tags: '',
      isPublished: false,
    },
  });

  useEffect(() => {
    const classId = video?.classId?.id ?? '';
    const subjectId = video?.subjectId?.id ?? '';
    reset({
      title: video?.title ?? '',
      description: video?.description ?? '',
      videoUrl: video?.videoUrl ?? '',
      videoType: video?.videoType ?? 'upload',
      subjectId,
      classId,
      thumbnailUrl: video?.thumbnailUrl ?? '',
      durationSeconds: video?.durationSeconds ?? 0,
      tags: video?.tags?.join(', ') ?? '',
      isPublished: video?.isPublished ?? false,
    });
    setTeachingGroup(classId && subjectId ? `${classId}:${subjectId}` : '');
  }, [video, reset]);

  function handleTeachingGroupChange(value: string | null) {
    if (!value) return;
    const option = teachingOptions.find((item) => item.value === value);
    setTeachingGroup(value);
    setValue('classId', option?.classId ?? '', { shouldValidate: true });
    setValue('subjectId', option?.subjectId ?? '', { shouldValidate: true });
  }

  async function onValid(values: FormValues) {
    if (!values.classId || !values.subjectId) {
      setError('classId', { type: 'validate', message: 'Select a class and subject' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateVideoPayload = {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        videoUrl: values.videoUrl.trim(),
        videoType: values.videoType,
        subjectId: values.subjectId,
        classId: values.classId,
        thumbnailUrl: values.thumbnailUrl.trim() || undefined,
        durationSeconds: values.durationSeconds || undefined,
        isPublished: values.isPublished,
        tags: values.tags
          ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [],
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
        <form id="video-form" onSubmit={handleSubmit(onValid)} className="space-y-4">
          <input type="hidden" {...register('classId', { required: 'Select a class and subject' })} />
          <input type="hidden" {...register('subjectId', { required: 'Select a class and subject' })} />

          <div className="space-y-1">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="videoUrl">Video URL <span className="text-destructive">*</span></Label>
            <Input
              id="videoUrl"
              {...register('videoUrl', { required: 'Video URL is required' })}
            />
            {errors.videoUrl && <p className="text-xs text-destructive">{errors.videoUrl.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Video Type <span className="text-destructive">*</span></Label>
            <Select
              value={watch('videoType')}
              onValueChange={(value: string | null) => {
                if (value) setValue('videoType', value as VideoType);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-1">
            <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
            <Input id="thumbnailUrl" {...register('thumbnailUrl')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="durationSeconds">Duration (seconds)</Label>
            <Input
              id="durationSeconds"
              type="number"
              min={0}
              {...register('durationSeconds', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" placeholder="math, grade 10, algebra" {...register('tags')} />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isPublished"
              checked={watch('isPublished') ?? false}
              onCheckedChange={(value: boolean) => setValue('isPublished', value)}
            />
            <Label htmlFor="isPublished">Published</Label>
          </div>
        </form>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" form="video-form" disabled={!canSubmit}>
          {submitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
