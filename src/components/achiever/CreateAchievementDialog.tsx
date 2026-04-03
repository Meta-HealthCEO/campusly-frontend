'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { StudentSelector } from '@/components/fees/StudentSelector';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CreateAchievementInput } from '@/hooks/useAchiever';

const schema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  type: z.enum(['academic', 'sport', 'cultural', 'behaviour'], { error: 'Type is required' }),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  term: z.number().int().min(1, 'Term is required'),
  year: z.number().int().min(2000, 'Year is required'),
  category: z.string().optional(),
  points: z.number().min(0),
  isPublic: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAchievementInput) => Promise<void>;
}

export function CreateAchievementDialog({ open, onOpenChange, onSubmit }: Props) {
  const { user } = useAuthStore();
  const [studentId, setStudentId] = useState('');

  const {
    register, handleSubmit, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { points: 0, isPublic: true, year: new Date().getFullYear(), term: 1 },
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        ...data,
        studentId,
        schoolId: user?.schoolId ?? '',
        awardedBy: user?.id ?? '',
      });
      toast.success('Achievement created successfully!');
      reset();
      setStudentId('');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create achievement';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />Add Achievement
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Achievement</DialogTitle>
          <DialogDescription>Award an achievement to a student.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
          <StudentSelector
            value={studentId}
            onValueChange={(v: unknown) => { setStudentId(v as string); setValue('studentId', v as string); }}
          />
          {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select onValueChange={(val: unknown) => setValue('type', val as FormData['type'])}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
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
              <Input type="number" {...register('points', { valueAsNumber: true })} placeholder="0" />
              {errors.points && <p className="text-xs text-destructive">{errors.points.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Title</Label>
            <Input {...register('title')} placeholder="Achievement title" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Textarea {...register('description')} placeholder="Details..." rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Term</Label>
              <Select defaultValue="1" onValueChange={(val: unknown) => setValue('term', Number(val))}>
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
              <Input {...register('category')} placeholder="e.g. maths" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch defaultChecked onCheckedChange={(v: boolean) => setValue('isPublic', v)} />
            <Label>Public</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
