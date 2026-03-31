'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { StudentSelector } from '@/components/fees/StudentSelector';
import apiClient from '@/lib/api-client';
import type { FeeType } from '@/types';

interface CreateExemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

const exemptionTypes = [
  { value: 'full', label: 'Full Exemption' },
  { value: 'partial', label: 'Partial' },
  { value: 'bursary', label: 'Bursary' },
  { value: 'sibling_discount', label: 'Sibling Discount' },
  { value: 'staff_discount', label: 'Staff Discount' },
  { value: 'early_payment', label: 'Early Payment' },
];

export function CreateExemptionDialog({
  open,
  onOpenChange,
  schoolId,
  onSuccess,
}: CreateExemptionDialogProps) {
  const [studentId, setStudentId] = useState('');
  const [feeTypeId, setFeeTypeId] = useState('');
  const [exemptionType, setExemptionType] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !schoolId) return;
    async function fetchFeeTypes() {
      try {
        const response = await apiClient.get(`/fees/types/school/${schoolId}`);
        const raw = response.data.data ?? response.data;
        const list: FeeType[] = Array.isArray(raw) ? raw : raw.feeTypes ?? raw.data ?? [];
        setFeeTypes(list);
      } catch {
        console.error('Failed to load fee types');
      }
    }
    fetchFeeTypes();
  }, [open, schoolId]);

  const resetForm = () => {
    setStudentId('');
    setFeeTypeId('');
    setExemptionType('');
    setDiscountPercentage('');
    setFixedAmount('');
    setReason('');
    setValidFrom('');
    setValidTo('');
  };

  const handleSubmit = async () => {
    if (!studentId || !feeTypeId || !exemptionType || !reason || !validFrom || !validTo) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        studentId,
        schoolId,
        feeTypeId,
        exemptionType,
        reason,
        validFrom,
        validTo,
      };
      if (discountPercentage) body.discountPercentage = parseFloat(discountPercentage);
      if (fixedAmount) body.fixedAmount = parseInt(fixedAmount, 10);

      await apiClient.post('/fees/exemptions', body);
      toast.success('Fee exemption created successfully!');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create exemption';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Fee Exemption</DialogTitle>
          <DialogDescription>Grant a fee exemption or bursary to a student.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <StudentSelector value={studentId} onValueChange={setStudentId} />
          <div className="space-y-2">
            <Label>Fee Type</Label>
            <Select value={feeTypeId} onValueChange={(val: unknown) => setFeeTypeId(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select fee type..." />
              </SelectTrigger>
              <SelectContent>
                {feeTypes.map((ft) => (
                  <SelectItem key={ft.id ?? ft._id} value={ft.id ?? ft._id ?? ''}>{ft.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Exemption Type</Label>
            <Select value={exemptionType} onValueChange={(val: unknown) => setExemptionType(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {exemptionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ex-pct">Discount %</Label>
              <Input id="ex-pct" type="number" value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)} placeholder="0-100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-fixed">Fixed Amount (cents)</Label>
              <Input id="ex-fixed" type="number" value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)} placeholder="e.g. 25000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ex-from">Valid From</Label>
              <Input id="ex-from" type="date" value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-to">Valid To</Label>
              <Input id="ex-to" type="date" value={validTo}
                onChange={(e) => setValidTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-reason">Reason</Label>
            <Textarea id="ex-reason" value={reason}
              onChange={(e) => setReason(e.target.value)} placeholder="Reason for exemption..." />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Exemption'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
