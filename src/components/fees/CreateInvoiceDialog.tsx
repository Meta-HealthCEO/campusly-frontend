'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useInvoiceDialogData } from '@/hooks/useFeeDialogData';
import { useInvoiceMutations, extractErrorMessage } from '@/hooks/useFeeMutations';
import type { FeeType } from '@/types';
import type { FeeScheduleOption } from '@/hooks/useFeeDialogData';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

export function CreateInvoiceDialog({ open, onOpenChange, schoolId, onSuccess }: CreateInvoiceDialogProps) {
  const { students, schedules } = useInvoiceDialogData(schoolId, open && !!schoolId);
  const { createInvoice } = useInvoiceMutations();
  const [studentId, setStudentId] = useState('');
  const [feeScheduleId, setFeeScheduleId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<{ description: string; amount: number }[]>([
    { description: '', amount: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const handleScheduleSelect = (schedId: string) => {
    setFeeScheduleId(schedId);
    const sched = schedules.find((s) => (s._id ?? s.id) === schedId);
    if (sched) {
      const ft = typeof sched.feeTypeId === 'object' ? sched.feeTypeId : null;
      if (ft) {
        setItems([{ description: ft.name, amount: ft.amount }]);
      }
      if (sched.dueDate) {
        setDueDate(sched.dueDate.split('T')[0]);
      }
    }
  };

  const addItem = () => setItems([...items, { description: '', amount: 0 }]);

  const updateItem = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...items];
    if (field === 'amount') {
      updated[index] = { ...updated[index], amount: Number(value) };
    } else {
      updated[index] = { ...updated[index], description: String(value) };
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);

  const handleSubmit = async () => {
    if (!studentId || !feeScheduleId || !dueDate || items.some((it) => !it.description || it.amount <= 0)) {
      toast.error(!feeScheduleId ? 'Please select a fee schedule' : 'Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await createInvoice({
        studentId,
        schoolId,
        feeScheduleId,
        items,
        dueDate,
      });
      toast.success('Invoice created successfully!');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create invoice'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStudentId('');
    setFeeScheduleId('');
    setDueDate('');
    setItems([{ description: '', amount: 0 }]);
  };

  const getScheduleLabel = (s: FeeScheduleOption) => {
    const ft = typeof s.feeTypeId === 'object' ? s.feeTypeId : null;
    const name = ft ? ft.name : 'Schedule';
    return `${name} - ${s.academicYear}${s.term ? ` T${s.term}` : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Create a new invoice for a student.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select onValueChange={(val: unknown) => setStudentId(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s._id ?? s.id} value={s._id ?? s.id}>
                    {s.user?.firstName ?? s.firstName} {s.user?.lastName ?? s.lastName} ({s.admissionNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {schedules.length > 0 && (
            <div className="space-y-2">
              <Label>Fee Schedule (optional)</Label>
              <Select onValueChange={(val: unknown) => handleScheduleSelect(val as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select schedule to auto-fill" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((s) => (
                    <SelectItem key={s._id ?? s.id} value={s._id ?? s.id}>
                      {getScheduleLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inv-dueDate">Due Date</Label>
            <Input id="inv-dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="e.g. Term 1 Tuition"
                  />
                </div>
                <div className="w-32">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Amount (cents)</Label>}
                  <Input
                    type="number"
                    value={item.amount || ''}
                    onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                    placeholder="450000"
                  />
                </div>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                    X
                  </Button>
                )}
              </div>
            ))}
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
