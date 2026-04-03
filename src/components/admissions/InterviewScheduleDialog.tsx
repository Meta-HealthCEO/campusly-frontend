'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InterviewType } from '@/types/admissions';

interface InterviewFormData {
  interviewDate: string;
  interviewType: InterviewType;
  interviewerName: string;
  venue: string;
  notes: string;
  notifyParent: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationNumber: string;
  onSubmit: (data: InterviewFormData) => Promise<void>;
}

export function InterviewScheduleDialog({
  open,
  onOpenChange,
  applicationNumber,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<InterviewFormData>({
    interviewDate: '',
    interviewType: 'in_person',
    interviewerName: '',
    venue: '',
    notes: '',
    notifyParent: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        interviewDate: '',
        interviewType: 'in_person',
        interviewerName: '',
        venue: '',
        notes: '',
        notifyParent: true,
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.interviewDate || !form.interviewerName) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Schedule interview failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Schedule Interview - {applicationNumber}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="interviewDate">Date & Time <span className="text-destructive">*</span></Label>
            <Input
              id="interviewDate"
              type="datetime-local"
              value={form.interviewDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev: InterviewFormData) => ({ ...prev, interviewDate: e.target.value }))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.interviewType}
              onValueChange={(val: string | null) => {
                if (val) setForm((prev: InterviewFormData) => ({ ...prev, interviewType: val as InterviewType }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interviewerName">Interviewer <span className="text-destructive">*</span></Label>
            <Input
              id="interviewerName"
              value={form.interviewerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev: InterviewFormData) => ({ ...prev, interviewerName: e.target.value }))}
              placeholder="Mrs. Van der Merwe"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={form.venue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev: InterviewFormData) => ({ ...prev, venue: e.target.value }))}
              placeholder="Principal's Office"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interviewNotes">Notes</Label>
            <Textarea
              id="interviewNotes"
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm((prev: InterviewFormData) => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="interviewNotify"
              checked={form.notifyParent}
              onCheckedChange={(checked: boolean) =>
                setForm((prev: InterviewFormData) => ({ ...prev, notifyParent: checked }))}
            />
            <Label htmlFor="interviewNotify">Notify parent by email</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.interviewDate || !form.interviewerName}
          >
            {submitting ? 'Scheduling...' : 'Schedule Interview'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
