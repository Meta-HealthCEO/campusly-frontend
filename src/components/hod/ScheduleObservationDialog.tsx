'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { CreateObservationPayload, FocusArea } from '@/types';

interface ScheduleObservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateObservationPayload) => Promise<void>;
  saving: boolean;
}

const ALL_FOCUS_AREAS: { value: FocusArea; label: string }[] = [
  { value: 'lesson_planning', label: 'Lesson Planning' },
  { value: 'learner_engagement', label: 'Learner Engagement' },
  { value: 'assessment_practices', label: 'Assessment Practices' },
  { value: 'classroom_management', label: 'Classroom Management' },
  { value: 'subject_knowledge', label: 'Subject Knowledge' },
  { value: 'differentiation', label: 'Differentiation' },
  { value: 'use_of_resources', label: 'Use of Resources' },
  { value: 'questioning_techniques', label: 'Questioning Techniques' },
];

export function ScheduleObservationDialog({
  open,
  onOpenChange,
  onSubmit,
  saving,
}: ScheduleObservationDialogProps) {
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [duration, setDuration] = useState(45);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);

  const toggleFocusArea = (area: FocusArea) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const handleSubmit = async () => {
    if (!teacherId || !classId || !subjectId || !scheduledDate || focusAreas.length === 0) return;
    await onSubmit({
      teacherId,
      classId,
      subjectId,
      scheduledDate: new Date(scheduledDate).toISOString(),
      duration,
      focusAreas,
    });
    // Reset
    setTeacherId('');
    setClassId('');
    setSubjectId('');
    setScheduledDate('');
    setDuration(45);
    setFocusAreas([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Schedule Observation</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="obs-teacher">
              Teacher ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="obs-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              placeholder="Teacher ObjectId"
              className="w-full"
            />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="obs-class">
                Class ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="obs-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                placeholder="Class ObjectId"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs-subject">
                Subject ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="obs-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder="Subject ObjectId"
              />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="obs-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="obs-date"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs-duration">Duration (minutes)</Label>
              <Input
                id="obs-duration"
                type="number"
                min={15}
                max={120}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Focus Areas <span className="text-destructive">*</span>
            </Label>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {ALL_FOCUS_AREAS.map((area) => (
                <label key={area.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={focusAreas.includes(area.value)}
                    onCheckedChange={() => toggleFocusArea(area.value)}
                  />
                  <span className="text-sm">{area.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
