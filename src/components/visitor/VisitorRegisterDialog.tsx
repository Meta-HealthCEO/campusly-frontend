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
import type { VisitorPurpose, RegisterVisitorPayload } from '@/types';

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

interface VisitorRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RegisterVisitorPayload) => Promise<void>;
  schoolId: string;
  saving: boolean;
}

const EMPTY: Omit<RegisterVisitorPayload, 'schoolId'> = {
  firstName: '', lastName: '', idNumber: '', phone: '', email: '',
  company: '', purpose: 'meeting', purposeDetail: '', hostName: '',
  vehicleRegistration: '', numberOfVisitors: 1,
};

export function VisitorRegisterDialog({
  open, onOpenChange, onSubmit, schoolId, saving,
}: VisitorRegisterDialogProps) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    await onSubmit({ ...form, schoolId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Visitor</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Name row */}
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

          {/* ID & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SA ID Number</Label>
              <Input
                value={form.idNumber ?? ''}
                onChange={(e) => set('idNumber', e.target.value)}
                maxLength={13}
                placeholder="13-digit SA ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+27..." />
            </div>
          </div>

          {/* Email & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Company / Organisation</Label>
              <Input value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} />
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label>Purpose <span className="text-destructive">*</span></Label>
            <Select value={form.purpose} onValueChange={(v: unknown) => set('purpose', v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose detail */}
          <div className="space-y-1.5">
            <Label>Purpose Details</Label>
            <Textarea
              value={form.purposeDetail ?? ''}
              onChange={(e) => set('purposeDetail', e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Host & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Visiting (Person)</Label>
              <Input
                value={form.hostName ?? ''}
                onChange={(e) => set('hostName', e.target.value)}
                placeholder="Name of host"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Registration</Label>
              <Input
                value={form.vehicleRegistration ?? ''}
                onChange={(e) => set('vehicleRegistration', e.target.value)}
                placeholder="e.g. CA 123-456"
              />
            </div>
          </div>

          {/* Number of visitors */}
          <div className="space-y-1.5 max-w-[160px]">
            <Label>Number of Visitors</Label>
            <Input
              type="number"
              min={1}
              value={form.numberOfVisitors ?? 1}
              onChange={(e) => set('numberOfVisitors', parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
          >
            {saving ? 'Registering...' : 'Register & Issue Pass'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
