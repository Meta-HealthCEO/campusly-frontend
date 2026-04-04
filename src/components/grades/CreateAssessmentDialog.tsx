'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Subject, Assessment } from '@/types';
import type { CreateAssessmentPayload } from '@/hooks/useTeacherGrades';

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

function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface CreateAssessmentDialogProps {
  subjects: Subject[];
  selectedClassId: string;
  selectedSubjectId: string;
  onCreateAssessment: (payload: CreateAssessmentPayload) => Promise<Assessment>;
}

export function CreateAssessmentDialog({
  subjects,
  selectedClassId,
  selectedSubjectId,
  onCreateAssessment,
}: CreateAssessmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<Assessment['type']>('test');
  const [totalMarks, setTotalMarks] = useState('');
  const [weight, setWeight] = useState('');
  const [term, setTerm] = useState('1');
  const [date, setDate] = useState(toLocalISODate(new Date()));
  const [subjectId, setSubjectId] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setType('test');
      setTotalMarks('');
      setWeight('');
      setTerm('1');
      setDate(toLocalISODate(new Date()));
      setSubjectId(selectedSubjectId || (subjects.length > 0 ? subjects[0].id : ''));
    }
  }, [open, selectedSubjectId, subjects]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Assessment name is required');
      return;
    }
    if (!subjectId) {
      toast.error('Please select a subject');
      return;
    }
    if (!totalMarks || Number(totalMarks) < 1) {
      toast.error('Total marks must be at least 1');
      return;
    }
    const weightNum = Number(weight);
    if (weight && (weightNum < 0 || weightNum > 100)) {
      toast.error('Weight must be between 0 and 100');
      return;
    }

    try {
      setSubmitting(true);
      await onCreateAssessment({
        name: name.trim(),
        subjectId,
        classId: selectedClassId,
        type,
        totalMarks: Number(totalMarks),
        weight: weight ? weightNum : 0,
        term: Number(term),
        date: new Date(date).toISOString(),
      });
      setOpen(false);
    } catch {
      // Error already toasted by hook
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name ?? 'Select subject';
  const selectedTypeName = ASSESSMENT_TYPES.find((t) => t.value === type)?.label ?? 'Select type';
  const selectedTermName = TERMS.find((t) => t.value === term)?.label ?? 'Select term';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" disabled={!selectedClassId} />}
      >
        <Plus className="mr-1 h-4 w-4" />
        Create Assessment
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Assessment</DialogTitle>
          <DialogDescription>Add a new assessment for this class.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assessment-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="assessment-name"
              placeholder="e.g. Term 1 Test"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Subject <span className="text-destructive">*</span>
            </Label>
            <Select value={subjectId} onValueChange={(val: unknown) => setSubjectId(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select subject">
                  {selectedSubjectName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={type} onValueChange={(val: unknown) => setType(val as Assessment['type'])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type">
                    {selectedTypeName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Term <span className="text-destructive">*</span>
              </Label>
              <Select value={term} onValueChange={(val: unknown) => setTerm(val as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select term">
                    {selectedTermName}
                  </SelectValue>
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
              <Label htmlFor="total-marks">
                Total Marks <span className="text-destructive">*</span>
              </Label>
              <Input
                id="total-marks"
                type="number"
                min={1}
                placeholder="e.g. 50"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (%)</Label>
              <Input
                id="weight"
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 25"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment-date">Date</Label>
            <Input
              id="assessment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
