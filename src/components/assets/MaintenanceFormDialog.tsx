'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type {
  AssetMaintenance,
  CreateMaintenancePayload,
  MaintenanceType,
  MaintenanceStatus,
} from '@/types';

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AssetMaintenance | null;
  onSubmit: (data: CreateMaintenancePayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<AssetMaintenance>) => Promise<void>;
}

const maintenanceTypes: { value: MaintenanceType; label: string }[] = [
  { value: 'repair', label: 'Repair' },
  { value: 'service', label: 'Service' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'inspection', label: 'Inspection' },
];

const maintenanceStatuses: { value: MaintenanceStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface FormState {
  type: MaintenanceType | '';
  description: string;
  vendor: string;
  costRands: string;
  scheduledDate: string;
  completedDate: string;
  status: MaintenanceStatus | '';
  notes: string;
}

const defaultForm: FormState = {
  type: '',
  description: '',
  vendor: '',
  costRands: '',
  scheduledDate: '',
  completedDate: '',
  status: 'scheduled',
  notes: '',
};

export function MaintenanceFormDialog({
  open,
  onOpenChange,
  record,
  onSubmit,
  onUpdate,
}: MaintenanceFormDialogProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          type: record.type,
          description: record.description,
          vendor: record.vendor ?? '',
          costRands: record.cost != null ? String(record.cost / 100) : '',
          scheduledDate: record.scheduledDate?.slice(0, 10) ?? '',
          completedDate: record.completedDate?.slice(0, 10) ?? '',
          status: record.status,
          notes: record.notes ?? '',
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [open, record]);

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const costCents = form.costRands ? Math.round(parseFloat(form.costRands) * 100) : undefined;

  const handleSubmit = async () => {
    if (!form.type) { toast.error('Select a maintenance type'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.status) { toast.error('Select a status'); return; }

    const payload: CreateMaintenancePayload = {
      type: form.type,
      description: form.description.trim(),
      vendor: form.vendor.trim() || undefined,
      cost: costCents,
      scheduledDate: form.scheduledDate || undefined,
      completedDate: form.completedDate || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (record && onUpdate) {
        await onUpdate(record.id, payload);
        toast.success('Maintenance record updated');
      } else {
        await onSubmit(payload);
        toast.success('Maintenance scheduled');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(record);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Maintenance' : 'Schedule Maintenance'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update maintenance record details.' : 'Record a new maintenance event for this asset.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={(v: unknown) => set('type')(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select value={form.status} onValueChange={(v: unknown) => set('status')(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maint-desc">Description <span className="text-destructive">*</span></Label>
            <Textarea
              id="maint-desc"
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="Describe the maintenance work"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maint-vendor">Vendor</Label>
              <Input
                id="maint-vendor"
                value={form.vendor}
                onChange={(e) => set('vendor')(e.target.value)}
                placeholder="e.g. ABC Repairs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maint-cost">Cost (Rands)</Label>
              <Input
                id="maint-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.costRands}
                onChange={(e) => set('costRands')(e.target.value)}
                placeholder="0.00"
              />
              {form.costRands && (
                <p className="text-xs text-muted-foreground">
                  = {costCents != null ? formatCurrency(costCents) : '—'}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maint-sched">Scheduled Date</Label>
              <Input
                id="maint-sched"
                type="date"
                value={form.scheduledDate}
                onChange={(e) => set('scheduledDate')(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maint-comp">Completed Date</Label>
              <Input
                id="maint-comp"
                type="date"
                value={form.completedDate}
                onChange={(e) => set('completedDate')(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maint-notes">Notes</Label>
            <Textarea
              id="maint-notes"
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
