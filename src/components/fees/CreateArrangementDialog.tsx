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
import { StudentSelector } from '@/components/fees/StudentSelector';
import apiClient from '@/lib/api-client';

interface CreateArrangementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

export function CreateArrangementDialog({
  open,
  onOpenChange,
  schoolId,
  onSuccess,
}: CreateArrangementDialogProps) {
  const [studentId, setStudentId] = useState('');
  const [totalOutstanding, setTotalOutstanding] = useState('');
  const [numberOfInstalments, setNumberOfInstalments] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setStudentId('');
    setTotalOutstanding('');
    setNumberOfInstalments('');
    setFrequency('');
    setStartDate('');
  };

  const handleSubmit = async () => {
    if (!studentId || !totalOutstanding || !numberOfInstalments || !frequency || !startDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    const totalCents = parseInt(totalOutstanding, 10);
    const numInstalments = parseInt(numberOfInstalments, 10);
    if (isNaN(totalCents) || totalCents <= 0) {
      toast.error('Total amount must be a positive number (in cents)');
      return;
    }
    if (isNaN(numInstalments) || numInstalments < 2 || numInstalments > 60) {
      toast.error('Number of instalments must be between 2 and 60');
      return;
    }
    const instalmentAmount = Math.ceil(totalCents / numInstalments);

    setSubmitting(true);
    try {
      await apiClient.post('/fees/payment-arrangements', {
        studentId,
        schoolId,
        totalOutstanding: totalCents,
        instalmentAmount,
        numberOfInstalments: numInstalments,
        frequency,
        startDate,
      });
      toast.success('Payment arrangement created successfully!');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create payment arrangement';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment Arrangement</DialogTitle>
          <DialogDescription>
            Set up an instalment plan for a student&apos;s outstanding debt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StudentSelector value={studentId} onValueChange={setStudentId} />
          <div className="space-y-2">
            <Label htmlFor="pa-total">Total Outstanding (cents)</Label>
            <Input id="pa-total" type="number" value={totalOutstanding}
              onChange={(e) => setTotalOutstanding(e.target.value)} placeholder="e.g. 950000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pa-num">Number of Instalments (2-60)</Label>
            <Input id="pa-num" type="number" min={2} max={60} value={numberOfInstalments}
              onChange={(e) => setNumberOfInstalments(e.target.value)} placeholder="e.g. 4" />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(val: unknown) => setFrequency(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pa-start">Start Date</Label>
            <Input id="pa-start" type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Arrangement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
