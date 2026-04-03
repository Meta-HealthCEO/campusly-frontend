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
  AssetIncident,
  CreateIncidentPayload,
  IncidentType,
} from '@/types';

interface IncidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: AssetIncident | null;
  onSubmit: (data: CreateIncidentPayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<AssetIncident>) => Promise<void>;
}

const incidentTypes: { value: IncidentType; label: string }[] = [
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss' },
  { value: 'theft', label: 'Theft' },
  { value: 'vandalism', label: 'Vandalism' },
];

interface FormState {
  type: IncidentType | '';
  description: string;
  date: string;
  responsiblePartyId: string;
  estimatedCostRands: string;
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const defaultForm: FormState = {
  type: '',
  description: '',
  date: todayLocal(),
  responsiblePartyId: '',
  estimatedCostRands: '',
};

export function IncidentFormDialog({
  open,
  onOpenChange,
  incident,
  onSubmit,
  onUpdate,
}: IncidentFormDialogProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (incident) {
        setForm({
          type: incident.type,
          description: incident.description,
          date: incident.date?.slice(0, 10) ?? todayLocal(),
          responsiblePartyId: incident.responsiblePartyId ?? '',
          estimatedCostRands:
            incident.estimatedCost != null
              ? String(incident.estimatedCost / 100)
              : '',
        });
      } else {
        setForm({ ...defaultForm, date: todayLocal() });
      }
    }
  }, [open, incident]);

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const estimatedCostCents =
    form.estimatedCostRands
      ? Math.round(parseFloat(form.estimatedCostRands) * 100)
      : undefined;

  const handleSubmit = async () => {
    if (!form.type) { toast.error('Select an incident type'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!form.date) { toast.error('Date is required'); return; }

    const payload: CreateIncidentPayload = {
      type: form.type,
      description: form.description.trim(),
      date: form.date,
      responsiblePartyId: form.responsiblePartyId.trim() || undefined,
      estimatedCost: estimatedCostCents,
    };

    setSubmitting(true);
    try {
      if (incident && onUpdate) {
        await onUpdate(incident.id, payload);
        toast.success('Incident updated');
      } else {
        await onSubmit(payload);
        toast.success('Incident reported');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(incident);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Incident' : 'Report Incident'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the incident record.'
              : 'Report a damage, loss, theft, or vandalism incident.'}
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
                  {incidentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inc-date">Date <span className="text-destructive">*</span></Label>
              <Input
                id="inc-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date')(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inc-desc">Description <span className="text-destructive">*</span></Label>
            <Textarea
              id="inc-desc"
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="Describe what happened"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inc-party">Responsible Party ID</Label>
              <Input
                id="inc-party"
                value={form.responsiblePartyId}
                onChange={(e) => set('responsiblePartyId')(e.target.value)}
                placeholder="Staff or student ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inc-cost">Estimated Cost (Rands)</Label>
              <Input
                id="inc-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedCostRands}
                onChange={(e) => set('estimatedCostRands')(e.target.value)}
                placeholder="0.00"
              />
              {form.estimatedCostRands && (
                <p className="text-xs text-muted-foreground">
                  = {estimatedCostCents != null ? formatCurrency(estimatedCostCents) : '—'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Report Incident'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
