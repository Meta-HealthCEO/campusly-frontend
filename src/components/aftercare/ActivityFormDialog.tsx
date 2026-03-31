'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { AfterCareActivity, StudentOption } from '@/hooks/useAftercare';

const ACTIVITY_TYPES = [
  { value: 'homework_help', label: 'Homework Help' },
  { value: 'sport', label: 'Sport' },
  { value: 'free_play', label: 'Free Play' },
  { value: 'arts_crafts', label: 'Arts & Crafts' },
  { value: 'reading', label: 'Reading' },
  { value: 'other', label: 'Other' },
];

interface StaffOption {
  id: string;
  name: string;
}

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: AfterCareActivity | null;
  students: StudentOption[];
  staff: StaffOption[];
  onCreate: (data: {
    date: string;
    activityType: string;
    name: string;
    description?: string;
    supervisorId: string;
    studentIds: string[];
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  onUpdate: (id: string, data: Partial<{
    date: string;
    activityType: string;
    name: string;
    description: string;
    supervisorId: string;
    studentIds: string[];
    startTime: string;
    endTime: string;
  }>) => Promise<void>;
}

export function ActivityFormDialog({
  open, onOpenChange, activity, students, staff, onCreate, onUpdate,
}: ActivityFormDialogProps) {
  const [name, setName] = useState('');
  const [activityType, setActivityType] = useState('homework_help');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [description, setDescription] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setActivityType(activity.activityType);
      setDate(activity.date ? activity.date.split('T')[0] : '');
      setStartTime(activity.startTime);
      setEndTime(activity.endTime);
      setDescription(activity.description ?? '');
      setSupervisorId(
        typeof activity.supervisorId === 'string'
          ? activity.supervisorId
          : activity.supervisorId._id,
      );
      setSelectedStudents(
        (activity.studentIds ?? []).map((s) =>
          typeof s === 'string' ? s : s._id,
        ),
      );
    } else {
      setName('');
      setActivityType('homework_help');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('14:00');
      setEndTime('15:00');
      setDescription('');
      setSupervisorId('');
      setSelectedStudents([]);
    }
  }, [activity, open]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date || !supervisorId) {
      toast.error('Name, date, and supervisor are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: new Date(date).toISOString(),
        activityType,
        name,
        description: description || undefined,
        supervisorId,
        studentIds: selectedStudents,
        startTime,
        endTime,
      };
      if (activity) {
        await onUpdate(activity.id, payload);
      } else {
        await onCreate(payload);
      }
      onOpenChange(false);
    } catch {
      toast.error('Failed to save activity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? 'Edit' : 'Create'} Activity</DialogTitle>
          <DialogDescription>
            {activity ? 'Update activity details.' : 'Schedule a new after-care activity.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Homework Support" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={activityType} onValueChange={(v: unknown) => setActivityType(v as string)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Activity description" />
          </div>
          <div className="space-y-2">
            <Label>Supervisor</Label>
            <Select value={supervisorId} onValueChange={(v: unknown) => setSupervisorId(v as string)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select supervisor" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Students</Label>
            <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-1">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm py-0.5">
                  <Checkbox
                    checked={selectedStudents.includes(s.id)}
                    onCheckedChange={() => toggleStudent(s.id)}
                  />
                  {s.name} {s.grade ? `(${s.grade})` : ''}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{selectedStudents.length} student(s) selected</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : activity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
