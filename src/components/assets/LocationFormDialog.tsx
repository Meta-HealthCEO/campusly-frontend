'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AssetLocation, CreateLocationPayload, LocationType } from '@/types';

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: AssetLocation | null;
  onSubmit: (data: CreateLocationPayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<AssetLocation>) => Promise<void>;
}

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'building', label: 'Building' },
  { value: 'room', label: 'Room' },
  { value: 'hall', label: 'Hall' },
  { value: 'field', label: 'Field' },
  { value: 'storage', label: 'Storage' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

interface FormValues {
  name: string;
  type: LocationType;
  building: string;
  floor: string;
  department: string;
  description: string;
}

const defaultValues: FormValues = {
  name: '',
  type: 'room',
  building: '',
  floor: '',
  department: '',
  description: '',
};

export function LocationFormDialog({
  open, onOpenChange, location, onSubmit, onUpdate,
}: LocationFormDialogProps) {
  const isEditing = !!location;

  const { register, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues,
  });

  const typeValue = watch('type');

  useEffect(() => {
    if (open) {
      if (location) {
        reset({
          name: location.name,
          type: location.type,
          building: location.building ?? '',
          floor: location.floor ?? '',
          department: location.department ?? '',
          description: location.description ?? '',
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, location, reset]);

  const onFormSubmit = async (values: FormValues) => {
    const payload: CreateLocationPayload = {
      name: values.name.trim(),
      type: values.type,
      building: values.building.trim() || undefined,
      floor: values.floor.trim() || undefined,
      department: values.department.trim() || undefined,
      description: values.description.trim() || undefined,
    };
    if (isEditing && location && onUpdate) {
      await onUpdate(location.id, payload);
    } else {
      await onSubmit(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Location' : 'Add Location'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the location details.' : 'Create a new asset location.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Science Lab A"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select
                value={typeValue}
                onValueChange={(val: unknown) => setValue('type', val as LocationType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input id="building" placeholder="e.g. Block A" {...register('building')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input id="floor" placeholder="e.g. Ground" {...register('floor')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" placeholder="e.g. Science" {...register('department')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about this location..."
                rows={3}
                {...register('description')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Location' : 'Add Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
