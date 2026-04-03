'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { LeaveType } from '@/types';

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'family_responsibility', label: 'Family Responsibility' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'study', label: 'Study Leave' },
];

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    isHalfDay: boolean;
    halfDayPeriod: 'morning' | 'afternoon' | null;
    documentUrl: string | null;
    substituteTeacherId: string | null;
  }) => Promise<void>;
  saving?: boolean;
}

export function LeaveRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  saving = false,
}: LeaveRequestDialogProps) {
  const [leaveType, setLeaveType] = useState<LeaveType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [documentUrl, setDocumentUrl] = useState('');

  useEffect(() => {
    if (open) {
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setIsHalfDay(false);
      setHalfDayPeriod('morning');
      setDocumentUrl('');
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!leaveType || !startDate || !endDate || !reason) return;
    await onSubmit({
      leaveType,
      startDate,
      endDate,
      reason,
      isHalfDay,
      halfDayPeriod: isHalfDay ? halfDayPeriod : null,
      documentUrl: documentUrl || null,
      substituteTeacherId: null,
    });
  }, [leaveType, startDate, endDate, reason, isHalfDay, halfDayPeriod, documentUrl, onSubmit]);

  const isValid = leaveType && startDate && endDate && reason.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>Submit a new leave request for review.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type <span className="text-destructive">*</span></Label>
            <Select value={leaveType || undefined} onValueChange={(val: unknown) => setLeaveType(val as LeaveType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date <span className="text-destructive">*</span></Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Half Day</Label>
              <p className="text-xs text-muted-foreground">Only taking half a day off</p>
            </div>
            <Switch checked={isHalfDay} onCheckedChange={setIsHalfDay} />
          </div>

          {isHalfDay && (
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={halfDayPeriod} onValueChange={(val: unknown) => setHalfDayPeriod(val as 'morning' | 'afternoon')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for your leave..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentUrl">Supporting Document URL</Label>
            <Input
              id="documentUrl"
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Optional. Link to a medical certificate or other supporting document.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !isValid}>
            {saving ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
