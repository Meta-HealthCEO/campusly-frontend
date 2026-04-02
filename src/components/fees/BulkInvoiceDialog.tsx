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
import { useBulkInvoiceDialogData } from '@/hooks/useFeeDialogData';
import { useInvoiceMutations, extractErrorMessage } from '@/hooks/useFeeMutations';
import type { FeeType } from '@/types';
import type { FeeScheduleOption } from '@/hooks/useFeeDialogData';

interface BulkInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

export function BulkInvoiceDialog({ open, onOpenChange, schoolId, onSuccess }: BulkInvoiceDialogProps) {
  const { grades, allStudents, schedules } = useBulkInvoiceDialogData(
    schoolId,
    open && !!schoolId,
  );
  const { createBulkInvoices } = useInvoiceMutations();
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [feeScheduleId, setFeeScheduleId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<{ description: string; amount: number }[]>([
    { description: '', amount: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const studentsInGrade = selectedGradeId
    ? allStudents.filter((s) => s.gradeId === selectedGradeId || (s.grade && (s.grade.id ?? (s.grade as unknown as Record<string, string>)._id) === selectedGradeId))
    : [];

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

  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);

  const handleSubmit = async () => {
    if (!selectedGradeId || !dueDate || items.some((it) => !it.description || it.amount <= 0)) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (studentsInGrade.length === 0) {
      toast.error('No students found in the selected grade');
      return;
    }
    setSubmitting(true);
    try {
      const studentIds = studentsInGrade.map((s) => s._id ?? s.id);
      await createBulkInvoices({
        schoolId,
        studentIds,
        items,
        dueDate,
        feeScheduleId: feeScheduleId || undefined,
      });
      toast.success(`Bulk invoices created for ${studentIds.length} students!`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create bulk invoices'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedGradeId('');
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
          <DialogTitle>Bulk Generate Invoices</DialogTitle>
          <DialogDescription>
            Generate invoices for all students in a grade.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Grade</Label>
            <Select onValueChange={(val: unknown) => setSelectedGradeId(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGradeId && (
              <p className="text-xs text-muted-foreground">
                {studentsInGrade.length} student(s) in this grade
              </p>
            )}
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
            <Label htmlFor="bulk-dueDate">Due Date</Label>
            <Input id="bulk-dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Line Items</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  className="flex-1"
                  value={item.description}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx] = { ...updated[idx], description: e.target.value };
                    setItems(updated);
                  }}
                  placeholder="Description"
                />
                <Input
                  className="w-32"
                  type="number"
                  value={item.amount || ''}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx] = { ...updated[idx], amount: Number(e.target.value) };
                    setItems(updated);
                  }}
                  placeholder="Amount (cents)"
                />
              </div>
            ))}
            <p className="text-sm text-muted-foreground">Total per student: {formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Generating...' : `Generate ${studentsInGrade.length} Invoice(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
