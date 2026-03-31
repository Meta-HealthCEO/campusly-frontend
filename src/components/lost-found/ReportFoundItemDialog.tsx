'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { foundItemSchema, type FoundItemFormData } from '@/lib/validations';

interface ReportFoundItemDialogProps {
  onSubmit: (data: FoundItemFormData) => Promise<void>;
}

export function ReportFoundItemDialog({ onSubmit }: ReportFoundItemDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FoundItemFormData>({ resolver: zodResolver(foundItemSchema) });

  const handleFormSubmit = async (data: FoundItemFormData) => {
    try {
      await onSubmit(data);
      reset();
      setOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to log found item.';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Log Found Item
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Found Item</DialogTitle>
          <DialogDescription>Enter details about the item that was found.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Blue School Jacket" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Describe the item..." />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={(val: unknown) => setValue('category', val as FoundItemFormData['category'])}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="stationery">Stationery</SelectItem>
                  <SelectItem value="lunch_box">Lunch Box</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="bags">Bags</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFound">Date Found</Label>
              <Input id="dateFound" type="date" {...register('dateFound')} />
              {errors.dateFound && <p className="text-xs text-destructive">{errors.dateFound.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location Found</Label>
            <Input id="location" {...register('location')} placeholder="e.g. Sports Field" />
            {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="photoUrl">Photo URL (optional)</Label>
            <Input id="photoUrl" {...register('photoUrl')} placeholder="https://..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
