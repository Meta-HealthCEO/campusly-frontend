'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ScheduleMessageFormProps {
  onSchedule: (scheduledFor: string) => Promise<void>;
  disabled?: boolean;
}

export function ScheduleMessageForm({ onSchedule, disabled }: ScheduleMessageFormProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !time) return;
    try {
      setSubmitting(true);
      const isoString = new Date(`${date}T${time}`).toISOString();
      await onSchedule(isoString);
    } finally {
      setSubmitting(false);
    }
  };

  // Minimum date is today
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const minDate = `${y}-${m}-${d}`;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div>
          <Label htmlFor="schedule-date">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="schedule-date"
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="schedule-time">
            Time <span className="text-destructive">*</span>
          </Label>
          <Input
            id="schedule-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || submitting || !date || !time}
        size="sm"
      >
        <CalendarClock className="mr-2 h-4 w-4" />
        {submitting ? 'Scheduling...' : 'Schedule Send'}
      </Button>
    </div>
  );
}
