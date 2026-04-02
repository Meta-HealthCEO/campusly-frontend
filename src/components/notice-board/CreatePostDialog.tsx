'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { NoticeBoardPost, CreateNoticeBoardPostInput, PostScope } from '@/types';

interface ScopeOption {
  id: string;
  name: string;
  scope: PostScope;
}

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateNoticeBoardPostInput) => Promise<void>;
  editPost?: NoticeBoardPost | null;
  onUpdate?: (id: string, data: { title?: string; content?: string; pinned?: boolean }) => Promise<void>;
  scopeOptions: ScopeOption[];
}

interface FormValues {
  scopeKey: string;
  title: string;
  content: string;
  pinned: boolean;
}

export function CreatePostDialog({
  open, onOpenChange, onSubmit, editPost, onUpdate, scopeOptions,
}: CreatePostDialogProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { scopeKey: '', title: '', content: '', pinned: false },
  });

  const pinned = watch('pinned');

  useEffect(() => {
    if (open) {
      if (editPost) {
        const matchKey = scopeOptions.find(
          (o) => o.scope === editPost.scope && o.id === editPost.scopeId,
        );
        reset({
          scopeKey: matchKey ? `${matchKey.scope}:${matchKey.id}` : '',
          title: editPost.title,
          content: editPost.content,
          pinned: editPost.pinned,
        });
      } else {
        reset({ scopeKey: scopeOptions[0] ? `${scopeOptions[0].scope}:${scopeOptions[0].id}` : '', title: '', content: '', pinned: false });
      }
    }
  }, [open, editPost, reset, scopeOptions]);

  const onFormSubmit = async (values: FormValues) => {
    if (editPost && onUpdate) {
      await onUpdate(editPost.id, {
        title: values.title,
        content: values.content,
        pinned: values.pinned,
      });
    } else {
      const [scope, scopeId] = values.scopeKey.split(':') as [PostScope, string];
      await onSubmit({ scope, scopeId, title: values.title, content: values.content, pinned: values.pinned });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{editPost ? 'Edit Post' : 'New Notice'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {!editPost && (
              <div className="space-y-1.5">
                <Label>Board <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('scopeKey')}
                  onValueChange={(val: unknown) => setValue('scopeKey', val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((opt) => (
                      <SelectItem key={`${opt.scope}:${opt.id}`} value={`${opt.scope}:${opt.id}`}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="post-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="post-title"
                placeholder="Post title"
                maxLength={200}
                {...register('title', { required: 'Title is required' })}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-content">Content <span className="text-destructive">*</span></Label>
              <Textarea
                id="post-content"
                placeholder="Write your notice..."
                rows={6}
                maxLength={4000}
                {...register('content', { required: 'Content is required' })}
              />
              {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={pinned}
                onCheckedChange={(val: boolean) => setValue('pinned', val)}
              />
              <Label>Pin to top of board</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editPost ? 'Update' : 'Post'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
