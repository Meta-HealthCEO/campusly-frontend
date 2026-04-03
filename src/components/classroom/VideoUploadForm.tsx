'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateVideoPayload, VideoLesson, VideoType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Plus, Pencil } from 'lucide-react';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  videoUrl: z.string().url('Must be a valid URL'),
  videoType: z.enum(['upload', 'youtube', 'vimeo', 'recording']),
  subjectId: z.string().optional(),
  gradeId: z.string().optional(),
  thumbnailUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  durationSeconds: z.coerce.number().min(0).optional(),
  tags: z.string().optional(),
  isPublished: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

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
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { videoType: 'upload', isPublished: false },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: video?.title ?? '',
        description: video?.description ?? '',
        videoUrl: video?.videoUrl ?? '',
        videoType: video?.videoType ?? 'upload',
        subjectId: video?.subjectId?.id ?? '',
        gradeId: video?.gradeId?.id ?? '',
        thumbnailUrl: video?.thumbnailUrl ?? '',
        durationSeconds: video?.durationSeconds ?? 0,
        tags: video?.tags?.join(', ') ?? '',
        isPublished: video?.isPublished ?? false,
      });
    }
  }, [open, video, reset]);

  async function onValid(values: FormValues) {
    setSubmitting(true);
    try {
      const payload: CreateVideoPayload = {
        title: values.title,
        description: values.description,
        videoUrl: values.videoUrl,
        videoType: values.videoType,
        subjectId: values.subjectId || undefined,
        gradeId: values.gradeId || undefined,
        thumbnailUrl: values.thumbnailUrl || undefined,
        durationSeconds: values.durationSeconds,
        isPublished: values.isPublished,
        tags: values.tags
          ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      };
      await onSubmit(payload);
      setOpen(false);
    } catch (err: unknown) {
      console.error('Failed to save video', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm" className="gap-1">
          {video ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {video ? 'Edit' : 'Add Video'}
        </Button>
      } />
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{video ? 'Edit Video' : 'Add Video Lesson'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          <form id="video-form" onSubmit={handleSubmit(onValid)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="videoUrl">Video URL <span className="text-destructive">*</span></Label>
              <Input id="videoUrl" {...register('videoUrl')} />
              {errors.videoUrl && <p className="text-xs text-destructive">{errors.videoUrl.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Video Type <span className="text-destructive">*</span></Label>
              <Select
                value={watch('videoType')}
                onValueChange={(val) => setValue('videoType', val as VideoType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="subjectId">Subject ID</Label>
                <Input id="subjectId" {...register('subjectId')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gradeId">Grade ID</Label>
                <Input id="gradeId" {...register('gradeId')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
              <Input id="thumbnailUrl" {...register('thumbnailUrl')} />
              {errors.thumbnailUrl && <p className="text-xs text-destructive">{errors.thumbnailUrl.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="durationSeconds">Duration (seconds)</Label>
              <Input id="durationSeconds" type="number" min={0} {...register('durationSeconds')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" placeholder="math, grade 10, algebra" {...register('tags')} />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isPublished"
                checked={watch('isPublished') ?? false}
                onCheckedChange={(val) => setValue('isPublished', val)}
              />
              <Label htmlFor="isPublished">Published</Label>
            </div>
          </form>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="video-form" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
