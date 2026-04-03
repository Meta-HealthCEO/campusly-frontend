'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { AvailabilityWindow, ConferenceEvent } from '@/types';

interface TeacherAvailabilityFormProps {
  event: ConferenceEvent;
  initialWindows?: AvailabilityWindow[];
  onSubmit: (windows: AvailabilityWindow[]) => Promise<void>;
  saving: boolean;
}

export function TeacherAvailabilityForm({
  event,
  initialWindows,
  onSubmit,
  saving,
}: TeacherAvailabilityFormProps) {
  const [windows, setWindows] = useState<AvailabilityWindow[]>(
    initialWindows?.length
      ? initialWindows
      : [{ startTime: event.startTime, endTime: event.endTime, location: '' }],
  );

  const updateWindow = (idx: number, field: keyof AvailabilityWindow, value: string) => {
    setWindows((prev) => prev.map((w, i) => (i === idx ? { ...w, [field]: value } : w)));
  };

  const addWindow = () => {
    setWindows((prev) => [...prev, { startTime: event.startTime, endTime: event.endTime, location: '' }]);
  };

  const removeWindow = (idx: number) => {
    setWindows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = windows.filter((w) => w.startTime && w.endTime);
    if (cleaned.length === 0) return;
    onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Event hours: {event.startTime} – {event.endTime} | {event.slotDurationMinutes}min slots,{' '}
        {event.breakBetweenMinutes}min breaks
      </p>

      {windows.map((w, idx) => (
        <Card key={idx}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Window {idx + 1}</span>
              {windows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWindow(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor={`start-${idx}`}>Start Time <span className="text-destructive">*</span></Label>
                <Input
                  id={`start-${idx}`}
                  type="time"
                  value={w.startTime}
                  onChange={(e) => updateWindow(idx, 'startTime', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor={`end-${idx}`}>End Time <span className="text-destructive">*</span></Label>
                <Input
                  id={`end-${idx}`}
                  type="time"
                  value={w.endTime}
                  onChange={(e) => updateWindow(idx, 'endTime', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor={`loc-${idx}`}>Location</Label>
                <Input
                  id={`loc-${idx}`}
                  placeholder="e.g. Room 12B"
                  value={w.location ?? ''}
                  onChange={(e) => updateWindow(idx, 'location', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" variant="outline" onClick={addWindow} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Window
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Set Availability'}
        </Button>
      </div>
    </form>
  );
}
