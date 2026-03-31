'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import type { BusRoute, BusStop } from '@/hooks/useTransport';

interface RouteFormValues {
  name: string;
  driverName: string;
  driverPhone: string;
  vehicleRegistration: string;
  capacity: string;
}

interface RouteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRoute: BusRoute | null;
  onSubmit: (data: Omit<BusRoute, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<BusRoute>) => Promise<void>;
}

export function RouteFormDialog({
  open, onOpenChange, editRoute, onSubmit, onUpdate,
}: RouteFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [stops, setStops] = useState<BusStop[]>([{ name: '', time: '' }]);
  const [isActive, setIsActive] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RouteFormValues>({
    defaultValues: { name: '', driverName: '', driverPhone: '', vehicleRegistration: '', capacity: '' },
  });

  useEffect(() => {
    if (editRoute) {
      reset({
        name: editRoute.name,
        driverName: editRoute.driverName,
        driverPhone: editRoute.driverPhone,
        vehicleRegistration: editRoute.vehicleRegistration,
        capacity: String(editRoute.capacity),
      });
      setStops(editRoute.stops.length > 0 ? editRoute.stops : [{ name: '', time: '' }]);
      setIsActive(editRoute.isActive);
    } else {
      reset({ name: '', driverName: '', driverPhone: '', vehicleRegistration: '', capacity: '' });
      setStops([{ name: '', time: '' }]);
      setIsActive(true);
    }
  }, [editRoute, reset]);

  const addStop = () => setStops((prev) => [...prev, { name: '', time: '' }]);

  const removeStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStop = (index: number, field: keyof BusStop, value: string | number) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const moveStop = (from: number, to: number) => {
    setStops((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const handleFormSubmit = async (data: RouteFormValues) => {
    const capacity = parseInt(data.capacity, 10);
    if (isNaN(capacity) || capacity <= 0) return;

    const validStops = stops.filter((s) => s.name.trim() && s.time.trim());
    if (validStops.length === 0) return;

    setSubmitting(true);
    try {
      const payload = {
        name: data.name.trim(),
        driverName: data.driverName.trim(),
        driverPhone: data.driverPhone.trim(),
        vehicleRegistration: data.vehicleRegistration.trim(),
        capacity,
        stops: validStops,
        isActive,
        schoolId: '',
      };

      if (editRoute) {
        await onUpdate(editRoute.id, payload);
      } else {
        await onSubmit(payload);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRoute ? 'Edit Route' : 'Add Route'}</DialogTitle>
          <DialogDescription>
            {editRoute ? 'Update bus route details.' : 'Create a new bus route.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FieldGroup label="Route Name" error={errors.name?.message}>
            <Input {...register('name', { required: 'Route name is required' })} placeholder="e.g. Route A - Centurion" />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Driver Name" error={errors.driverName?.message}>
              <Input {...register('driverName', { required: 'Required' })} placeholder="Driver name" />
            </FieldGroup>
            <FieldGroup label="Driver Phone" error={errors.driverPhone?.message}>
              <Input {...register('driverPhone', { required: 'Required' })} placeholder="079 123 4567" />
            </FieldGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Vehicle Registration" error={errors.vehicleRegistration?.message}>
              <Input {...register('vehicleRegistration', { required: 'Required' })} placeholder="GP 123 ABC" />
            </FieldGroup>
            <FieldGroup label="Capacity" error={errors.capacity?.message}>
              <Input
                {...register('capacity', {
                  required: 'Required',
                  validate: (v) => {
                    const n = parseInt(v, 10);
                    return (!isNaN(n) && n > 0) || 'Must be positive';
                  },
                })}
                type="number"
                min="1"
                placeholder="35"
              />
            </FieldGroup>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={(val: boolean) => setIsActive(val)} />
            Active
          </label>

          <StopEditor
            stops={stops}
            onAdd={addStop}
            onRemove={removeStop}
            onUpdate={updateStop}
            onMove={moveStop}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editRoute ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sub-components ── */

function FieldGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function StopEditor({ stops, onAdd, onRemove, onUpdate, onMove }: {
  stops: BusStop[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: keyof BusStop, value: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Stops</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add Stop
        </Button>
      </div>
      {stops.map((stop, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {i + 1}
          </span>
          <Input
            className="flex-1"
            placeholder="Stop name"
            value={stop.name}
            onChange={(e) => onUpdate(i, 'name', e.target.value)}
          />
          <Input
            className="w-24"
            placeholder="HH:MM"
            value={stop.time}
            onChange={(e) => onUpdate(i, 'time', e.target.value)}
          />
          <div className="flex gap-1">
            <Button
              type="button" variant="ghost" size="icon-sm"
              disabled={i === 0}
              onClick={() => onMove(i, i - 1)}
              title="Move up"
            >
              &#9650;
            </Button>
            <Button
              type="button" variant="ghost" size="icon-sm"
              disabled={i === stops.length - 1}
              onClick={() => onMove(i, i + 1)}
              title="Move down"
            >
              &#9660;
            </Button>
          </div>
          <Button
            type="button" variant="ghost" size="icon-sm"
            onClick={() => onRemove(i)}
            disabled={stops.length <= 1}
            className="text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {stops.every((s) => !s.name.trim() || !s.time.trim()) && (
        <p className="text-xs text-destructive">At least one stop with name and time is required</p>
      )}
    </div>
  );
}
