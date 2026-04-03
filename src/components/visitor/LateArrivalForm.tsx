'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LateArrivalReason, RecordLateArrivalPayload } from '@/types';

const REASONS: { value: LateArrivalReason; label: string }[] = [
  { value: 'traffic', label: 'Traffic' },
  { value: 'medical', label: 'Medical' },
  { value: 'transport', label: 'Transport Issue' },
  { value: 'family', label: 'Family' },
  { value: 'other', label: 'Other' },
];

function toLocalISOTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

interface LateArrivalFormProps {
  onSubmit: (data: RecordLateArrivalPayload) => Promise<void>;
  schoolId: string;
  saving: boolean;
}

export function LateArrivalForm({ onSubmit, schoolId, saving }: LateArrivalFormProps) {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [arrivalTime, setArrivalTime] = useState(toLocalISOTime());
  const [reason, setReason] = useState<LateArrivalReason>('traffic');
  const [reasonDetail, setReasonDetail] = useState('');
  const [parentNotified, setParentNotified] = useState(true);
  const [accompaniedBy, setAccompaniedBy] = useState('');

  useEffect(() => {
    setArrivalTime(toLocalISOTime());
  }, []);

  const reset = () => {
    setStudentId('');
    setStudentName('');
    setArrivalTime(toLocalISOTime());
    setReason('traffic');
    setReasonDetail('');
    setParentNotified(true);
    setAccompaniedBy('');
  };

  const handleSubmit = async () => {
    if (!studentId.trim() && !studentName.trim()) return;
    const now = new Date();
    const [h, m] = arrivalTime.split(':').map(Number);
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

    await onSubmit({
      schoolId,
      studentId: studentId || studentName,
      arrivalTime: dt.toISOString(),
      reason,
      reasonDetail: reasonDetail || undefined,
      parentNotified,
      accompaniedBy: accompaniedBy || undefined,
    });
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Late Arrival</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Student Name / ID <span className="text-destructive">*</span></Label>
            <Input
              value={studentName}
              onChange={(e) => { setStudentName(e.target.value); setStudentId(e.target.value); }}
              placeholder="Search student..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Arrival Time <span className="text-destructive">*</span></Label>
            <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={(v: unknown) => setReason(v as LateArrivalReason)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Accompanied By</Label>
            <Input value={accompaniedBy} onChange={(e) => setAccompaniedBy(e.target.value)} placeholder="Name of person" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Additional Details</Label>
          <Textarea
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            rows={2}
            maxLength={500}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={parentNotified}
            onCheckedChange={(v: boolean | 'indeterminate') => setParentNotified(v === true)}
          />
          <Label className="text-sm">Notify parent</Label>
        </div>

        <Button onClick={handleSubmit} disabled={saving || (!studentId.trim() && !studentName.trim())}>
          {saving ? 'Recording...' : 'Record Late Arrival'}
        </Button>
      </CardContent>
    </Card>
  );
}
