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
import type { EarlyDepartureReason, RecordEarlyDeparturePayload } from '@/types';

const REASONS: { value: EarlyDepartureReason; label: string }[] = [
  { value: 'medical', label: 'Medical' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'family_emergency', label: 'Family Emergency' },
  { value: 'sport', label: 'Sport' },
  { value: 'other', label: 'Other' },
];

function toLocalISOTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

interface EarlyDepartureFormProps {
  onSubmit?: (data: RecordEarlyDeparturePayload) => Promise<void>;
  schoolId: string;
  saving: boolean;
}

export function EarlyDepartureForm({ onSubmit, schoolId, saving }: EarlyDepartureFormProps) {
  const [studentName, setStudentName] = useState('');
  const [departureTime, setDepartureTime] = useState(toLocalISOTime());
  const [reason, setReason] = useState<EarlyDepartureReason>('medical');
  const [reasonDetail, setReasonDetail] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [collectedBy, setCollectedBy] = useState('');
  const [collectedByIdNumber, setCollectedByIdNumber] = useState('');
  const [collectedByRelation, setCollectedByRelation] = useState('');
  const [parentNotified, setParentNotified] = useState(true);

  useEffect(() => {
    setDepartureTime(toLocalISOTime());
  }, []);

  const reset = () => {
    setStudentName('');
    setDepartureTime(toLocalISOTime());
    setReason('medical');
    setReasonDetail('');
    setAuthorizedBy('');
    setCollectedBy('');
    setCollectedByIdNumber('');
    setCollectedByRelation('');
    setParentNotified(true);
  };

  const handleSubmit = async () => {
    if (!studentName.trim() || !collectedBy.trim()) return;
    const now = new Date();
    const [h, m] = departureTime.split(':').map(Number);
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

    await onSubmit?.({
      schoolId,
      studentId: studentName,
      departureTime: dt.toISOString(),
      reason,
      reasonDetail: reasonDetail || undefined,
      authorizedById: authorizedBy || undefined,
      collectedBy,
      collectedByIdNumber: collectedByIdNumber || undefined,
      collectedByRelation: collectedByRelation || undefined,
      parentNotified,
    });
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Early Departure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Student <span className="text-destructive">*</span></Label>
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Search student..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Departure Time <span className="text-destructive">*</span></Label>
            <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={(v: unknown) => setReason(v as EarlyDepartureReason)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Authorized By</Label>
            <Input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} placeholder="Staff member" />
          </div>
        </div>

        {/* Collector info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Collected By <span className="text-destructive">*</span></Label>
            <Input value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Collector ID Number</Label>
            <Input
              value={collectedByIdNumber}
              onChange={(e) => setCollectedByIdNumber(e.target.value)}
              maxLength={13}
              placeholder="13-digit SA ID"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Relation</Label>
            <Input
              value={collectedByRelation}
              onChange={(e) => setCollectedByRelation(e.target.value)}
              placeholder="e.g. Mother"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Additional Details</Label>
          <Textarea value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} rows={2} maxLength={500} />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={parentNotified}
            onCheckedChange={(v: boolean | 'indeterminate') => setParentNotified(v === true)}
          />
          <Label className="text-sm">Notify parent</Label>
        </div>

        <Button onClick={handleSubmit} disabled={saving || !onSubmit || !studentName.trim() || !collectedBy.trim()}>
          {saving ? 'Recording...' : 'Record Early Departure'}
        </Button>
      </CardContent>
    </Card>
  );
}
