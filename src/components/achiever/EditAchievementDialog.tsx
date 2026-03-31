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
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { ApiAchievement, CreateAchievementInput } from '@/hooks/useAchiever';

const schema = z.object({
  type: z.enum(['academic', 'sport', 'cultural', 'behaviour']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  term: z.number().int().min(1),
  year: z.number().int().min(2000),
  category: z.string().optional(),
  points: z.number().min(0),
  isPublic: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: ApiAchievement | null;
  onSubmit: (id: string, data: Partial<CreateAchievementInput>) => Promise<void>;
}

export function EditAchievementDialog({ open, onOpenChange, achievement, onSubmit }: Props) {
  const {
    register, handleSubmit, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (achievement) {
      reset({
        type: achievement.type,
        title: achievement.title,
        description: achievement.description ?? '',
        term: achievement.term,
        year: achievement.year,
        category: achievement.category ?? '',
        points: achievement.points,
        isPublic: achievement.isPublic,
      });
    }
  }, [achievement, reset]);

  const handleFormSubmit = async (data: FormData) => {
    if (!achievement) return;
    try {
      await onSubmit(achievement._id, data);
      toast.success('Achievement updated!');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update achievement';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Achievement</DialogTitle>
          <DialogDescription>Update the achievement details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={achievement?.type}
                onValueChange={(val: unknown) => setValue('type', val as FormData['type'])}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="sport">Sport</SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="behaviour">Behaviour</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Points</Label>
              <Input type="number" {...register('points', { valueAsNumber: true })} />
              {errors.points && <p className="text-xs text-destructive">{errors.points.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Title</Label>
            <Input {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea {...register('description')} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Term</Label>
              <Select
                value={achievement ? String(achievement.term) : undefined}
                onValueChange={(val: unknown) => setValue('term', Number(val))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((t) => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" {...register('year', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input {...register('category')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={achievement?.isPublic ?? true}
              onCheckedChange={(v: boolean) => setValue('isPublic', v)}
            />
            <Label>Public</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
