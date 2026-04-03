'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { CreateIncidentPayload, IncidentType, SeverityLevel } from '@/types';

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'bullying', label: 'Bullying' },
  { value: 'injury', label: 'Injury' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'substance', label: 'Substance' },
  { value: 'theft', label: 'Theft' },
  { value: 'verbal_abuse', label: 'Verbal Abuse' },
  { value: 'cyber_bullying', label: 'Cyber Bullying' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS: { value: SeverityLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface IncidentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateIncidentPayload) => Promise<void>;
}

export function IncidentReportDialog({
  open, onOpenChange, onSubmit,
}: IncidentReportDialogProps) {
  const [type, setType] = useState<IncidentType>('other');
  const [severity, setSeverity] = useState<SeverityLevel>('low');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentTime, setIncidentTime] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setType('other');
    setSeverity('low');
    setTitle('');
    setDescription('');
    setLocation('');
    setIncidentDate('');
    setIncidentTime('');
    setImmediateAction('');
  };

  const handleSubmit = async () => {
    if (!title || !description || !incidentDate) return;
    try {
      setSubmitting(true);
      await onSubmit({
        type, severity, title, description, location: location || undefined,
        incidentDate, incidentTime: incidentTime || undefined,
        immediateActionTaken: immediateAction || undefined,
      });
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to submit incident', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={type} onValueChange={(v: unknown) => { if (v) setType(v as IncidentType); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Severity <span className="text-destructive">*</span></Label>
              <Select value={severity} onValueChange={(v: unknown) => { if (v) setSeverity(v as SeverityLevel); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_LEVELS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title" />
          </div>
          <div className="space-y-1">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..." rows={4} />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Time</Label>
              <Input type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where did it occur?" />
          </div>
          <div className="space-y-1">
            <Label>Immediate Action Taken</Label>
            <Textarea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)}
              placeholder="Describe any immediate steps taken..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !title || !description || !incidentDate}>
            {submitting ? 'Reporting...' : 'Report Incident'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
