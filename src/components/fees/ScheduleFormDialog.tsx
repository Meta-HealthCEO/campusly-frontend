'use client';

import { useState, useEffect } from 'react';
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
import { useScheduleMutations, extractErrorMessage } from '@/hooks/useFeeMutations';
import type { FeeType, Grade } from '@/types';
import type { FeeSchedule } from './FeeScheduleSection';

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: FeeSchedule | null;
  schoolId: string;
  feeTypes: FeeType[];
  grades: Grade[];
  onSuccess: () => void;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  schoolId,
  feeTypes,
  grades,
  onSuccess,
}: ScheduleFormDialogProps) {
  const isEdit = !!schedule;
  const { createSchedule, updateSchedule } = useScheduleMutations();
  const [feeTypeId, setFeeTypeId] = useState('');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [scopeType, setScopeType] = useState<'school' | 'grade' | 'student'>('school');
  const [targetId, setTargetId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (schedule && open) {
      const ftId = typeof schedule.feeTypeId === 'object'
        ? (schedule.feeTypeId._id ?? schedule.feeTypeId.id)
        : schedule.feeTypeId;
      setFeeTypeId(ftId);
      setAcademicYear(schedule.academicYear);
      setTerm(schedule.term);
      setDueDate(schedule.dueDate.split('T')[0]);
      setScopeType(schedule.appliesTo.type);
      setTargetId(schedule.appliesTo.targetId);
    } else if (!schedule && open) {
      resetForm();
    }
  }, [schedule, open]);

  const resetForm = () => {
    setFeeTypeId('');
    setAcademicYear(new Date().getFullYear());
    setTerm(undefined);
    setDueDate('');
    setScopeType('school');
    setTargetId('');
  };

  const handleSubmit = async () => {
    if (!feeTypeId || !dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    const resolvedTargetId = scopeType === 'school' ? schoolId : targetId;
    if (!resolvedTargetId) {
      toast.error('Please select a target for the scope');
      return;
    }
    setSubmitting(true);
    try {
      const appliesTo = { type: scopeType, targetId: resolvedTargetId };
      if (isEdit) {
        const schedId = schedule._id ?? schedule.id;
        await updateSchedule(schedId, {
          academicYear,
          term: term || undefined,
          dueDate,
          appliesTo,
        });
        toast.success('Schedule updated successfully!');
      } else {
        await createSchedule({
          feeTypeId,
          schoolId,
          academicYear,
          term: term || undefined,
          dueDate,
          appliesTo,
        });
        toast.success('Schedule created successfully!');
      }
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      const fallback = isEdit ? 'Failed to update schedule' : 'Failed to create schedule';
      toast.error(extractErrorMessage(err, fallback));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Schedule' : 'Create Fee Schedule'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the fee schedule details.' : 'Link a fee type to a term and due date.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fee Type</Label>
            <Select
              value={feeTypeId}
              onValueChange={(val: unknown) => setFeeTypeId(val as string)}
              disabled={isEdit}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select fee type" />
              </SelectTrigger>
              <SelectContent>
                {feeTypes.map((ft) => (
                  <SelectItem key={ft._id ?? ft.id} value={ft._id ?? ft.id}>
                    {ft.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sched-year">Academic Year</Label>
              <Input
                id="sched-year"
                type="number"
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
                min={2000}
                max={2100}
              />
            </div>
            <div className="space-y-2">
              <Label>Term (optional)</Label>
              <Select
                value={term ? String(term) : ''}
                onValueChange={(val: unknown) => setTerm(val === '' ? undefined : Number(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                  <SelectItem value="4">Term 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sched-due">Due Date</Label>
            <Input id="sched-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <Select
              value={scopeType}
              onValueChange={(val: unknown) => {
                setScopeType(val as 'school' | 'grade' | 'student');
                setTargetId('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school">Whole School</SelectItem>
                <SelectItem value="grade">Specific Grade</SelectItem>
                <SelectItem value="student">Specific Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scopeType === 'grade' && (
            <div className="space-y-2">
              <Label>Target Grade</Label>
              <Select value={targetId} onValueChange={(val: unknown) => setTargetId(val as string)}>
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
            </div>
          )}

          {scopeType === 'student' && (
            <div className="space-y-2">
              <Label htmlFor="sched-studentId">Student ID</Label>
              <Input
                id="sched-studentId"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Enter student ID"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
