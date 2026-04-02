'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SchedulePublishPickerProps {
  onSchedule: (publishAt: string) => Promise<void>;
  currentSchedule?: string | null;
}

export function SchedulePublishPicker({
  onSchedule,
  currentSchedule,
}: SchedulePublishPickerProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const minDate = `${y}-${m}-${d}`;

  const handleSchedule = async () => {
    if (!date || !time) return;
    setSubmitting(true);
    try {
      const isoString = new Date(`${date}T${time}`).toISOString();
      await onSchedule(isoString);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {currentSchedule && (
        <p className="text-xs text-muted-foreground">
          Currently scheduled: {new Date(currentSchedule).toLocaleString()}
        </p>
      )}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        <div>
          <Label htmlFor="pub-date">Date</Label>
          <Input id="pub-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <Label htmlFor="pub-time">Time</Label>
          <Input id="pub-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" />
        </div>
      </div>
      <Button size="sm" onClick={handleSchedule} disabled={submitting || !date || !time}>
        <CalendarClock className="mr-2 h-4 w-4" />
        {submitting ? 'Scheduling...' : 'Schedule Publish'}
      </Button>
    </div>
  );
}
