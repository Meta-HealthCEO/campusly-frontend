'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CreateHouseInput } from '@/hooks/useAchiever';

const schema = z.object({
  houseName: z.string().min(1, 'House name is required'),
  houseColor: z.string().min(1, 'Colour is required'),
  term: z.number().int().min(1, 'Term is required'),
  year: z.number().int().min(2000, 'Year is required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateHouseInput) => Promise<void>;
}

export function CreateHouseDialog({ open, onOpenChange, onSubmit }: Props) {
  const { user } = useAuthStore();

  const {
    register, handleSubmit, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { houseColor: '#2563EB', year: new Date().getFullYear(), term: 1 },
  });

  const handleFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({ ...data, schoolId: user?.schoolId ?? '' });
      toast.success('House created!');
      reset({ houseColor: '#2563EB', year: new Date().getFullYear(), term: 1, houseName: '' });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create house';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />Add House
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add House</DialogTitle>
          <DialogDescription>Create a new school house.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>House Name</Label>
            <Input {...register('houseName')} placeholder="e.g. Eagles" />
            {errors.houseName && <p className="text-xs text-destructive">{errors.houseName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>House Colour</Label>
            <div className="flex items-center gap-2">
              <Input type="color" {...register('houseColor')} className="h-10 w-16 p-1 cursor-pointer" />
              <Input {...register('houseColor')} placeholder="#2563EB" className="flex-1" />
            </div>
            {errors.houseColor && <p className="text-xs text-destructive">{errors.houseColor.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Term</Label>
              <Select defaultValue="1" onValueChange={(val: unknown) => setValue('term', Number(val))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((t) => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" {...register('year', { valueAsNumber: true })} />
              {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
            </div>
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
