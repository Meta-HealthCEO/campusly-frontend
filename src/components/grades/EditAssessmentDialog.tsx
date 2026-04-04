'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { Assessment } from '@/types';
import type { UpdateAssessmentPayload } from '@/hooks/useTeacherGrades';

const ASSESSMENT_TYPES: { value: Assessment['type']; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'exam', label: 'Exam' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
  { value: 'project', label: 'Project' },
];

const TERMS = [
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
  { value: '4', label: 'Term 4' },
];

function toLocalISODate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface EditAssessmentDialogProps {
  open: boolean;
  assessment: Assessment | null;
  onClose: () => void;
  onUpdate: (id: string, payload: UpdateAssessmentPayload) => Promise<void>;
}

export function EditAssessmentDialog({
  open,
  assessment,
  onClose,
  onUpdate,
}: EditAssessmentDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Assessment['type']>('test');
  const [totalMarks, setTotalMarks] = useState('');
  const [weight, setWeight] = useState('');
  const [term, setTerm] = useState('1');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (open && assessment) {
      setName(assessment.name);
      setType(assessment.type);
      setTotalMarks(String(assessment.totalMarks));
      setWeight(String(assessment.weight));
      setTerm(String(assessment.term));
      setDate(assessment.date ? toLocalISODate(assessment.date) : '');
    }
  }, [open, assessment]);

  const handleSubmit = async () => {
    if (!assessment) return;
    try {
      setSubmitting(true);
      await onUpdate(assessment.id, {
        name: name.trim(),
        type,
        totalMarks: Number(totalMarks),
        weight: Number(weight),
        term: Number(term),
        date: date ? new Date(date).toISOString() : undefined,
      });
      onClose();
    } catch {
      // Error already toasted by hook
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeName = ASSESSMENT_TYPES.find((t) => t.value === type)?.label ?? 'Select type';
  const selectedTermName = TERMS.find((t) => t.value === term)?.label ?? 'Select term';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Assessment</DialogTitle>
          <DialogDescription>Update the assessment details.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={type} onValueChange={(val: unknown) => setType(val as Assessment['type'])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type">{selectedTypeName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Term <span className="text-destructive">*</span></Label>
              <Select value={term} onValueChange={(val: unknown) => setTerm(val as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select term">{selectedTermName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-total-marks">
                Total Marks <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-total-marks"
                type="number"
                min={1}
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-weight">Weight (%)</Label>
              <Input
                id="edit-weight"
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
