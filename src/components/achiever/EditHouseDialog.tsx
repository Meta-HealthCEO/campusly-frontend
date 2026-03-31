'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { ApiHousePoints, CreateHouseInput } from '@/hooks/useAchiever';

const schema = z.object({
  houseName: z.string().min(1, 'Name is required').trim(),
  houseColor: z.string().min(1, 'Colour is required').trim(),
});

type FormData = z.infer<typeof schema>;

interface EditHouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: ApiHousePoints | null;
  onSubmit: (id: string, data: Partial<CreateHouseInput>) => Promise<void>;
}

export function EditHouseDialog({ open, onOpenChange, house, onSubmit }: EditHouseDialogProps) {
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (house) reset({ houseName: house.houseName, houseColor: house.houseColor });
  }, [house, reset]);

  const handleFormSubmit = async (data: FormData) => {
    if (!house) return;
    try {
      await onSubmit(house._id, data);
      toast.success('House updated!');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update house';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit House</DialogTitle>
          <DialogDescription>Update house name or colour.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>House Name</Label>
            <Input {...register('houseName')} />
            {errors.houseName && <p className="text-xs text-destructive">{errors.houseName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>House Colour</Label>
            <div className="flex items-center gap-2">
              <Input type="color" {...register('houseColor')} className="h-10 w-16 p-1 cursor-pointer" />
              <Input {...register('houseColor')} className="flex-1" />
            </div>
            {errors.houseColor && <p className="text-xs text-destructive">{errors.houseColor.message}</p>}
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
