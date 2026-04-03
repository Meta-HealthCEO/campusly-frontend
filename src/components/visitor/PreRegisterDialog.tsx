'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { VisitorPurpose, CreatePreRegistrationPayload } from '@/types';

const PURPOSES: { value: VisitorPurpose; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'parent_visit', label: 'Parent Visit' },
  { value: 'government', label: 'Government' },
  { value: 'interview', label: 'Interview' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'other', label: 'Other' },
];

function toLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface PreRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePreRegistrationPayload) => Promise<void>;
  schoolId: string;
  saving: boolean;
}

interface FormState {
  firstName: string;
  lastName: string;
  company: string;
  purpose: VisitorPurpose;
  purposeDetail: string;
  expectedDate: string;
  expectedTime: string;
  vehicleRegistration: string;
  notes: string;
}

const EMPTY: FormState = {
  firstName: '', lastName: '', company: '', purpose: 'meeting',
  purposeDetail: '', expectedDate: toLocalDate(), expectedTime: '',
  vehicleRegistration: '', notes: '',
};

export function PreRegisterDialog({
  open, onOpenChange, onSubmit, schoolId, saving,
}: PreRegisterDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (open) setForm({ ...EMPTY, expectedDate: toLocalDate() });
  }, [open]);

  const set = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.expectedDate) return;
    await onSubmit({
      schoolId,
      firstName: form.firstName,
      lastName: form.lastName,
      company: form.company || undefined,
      purpose: form.purpose,
      purposeDetail: form.purposeDetail || undefined,
      expectedDate: form.expectedDate,
      expectedTime: form.expectedTime || undefined,
      vehicleRegistration: form.vehicleRegistration || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pre-Register Visitor</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Company / Organisation</Label>
            <Input value={form.company} onChange={(e) => set('company', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expected Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.expectedDate} onChange={(e) => set('expectedDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Time</Label>
              <Input type="time" value={form.expectedTime} onChange={(e) => set('expectedTime', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Purpose <span className="text-destructive">*</span></Label>
            <Select value={form.purpose} onValueChange={(v: unknown) => set('purpose', v as VisitorPurpose)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Vehicle Registration</Label>
            <Input value={form.vehicleRegistration} onChange={(e) => set('vehicleRegistration', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} maxLength={500} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.firstName.trim() || !form.lastName.trim() || !form.expectedDate}
          >
            {saving ? 'Saving...' : 'Pre-Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
