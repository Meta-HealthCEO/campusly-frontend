'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import type { RecordPersonalBestPayload } from '@/types/sport';

interface RecordPersonalBestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportCode: string;
  onSubmit: (payload: RecordPersonalBestPayload) => Promise<void>;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function RecordPersonalBestDialog({
  open, onOpenChange, sportCode, onSubmit,
}: RecordPersonalBestDialogProps) {
  const [event, setEvent] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!event.trim() || !value || !unit.trim()) return;
    try {
      setSaving(true);
      await onSubmit({
        sportCode,
        event: event.trim(),
        value: Number(value),
        unit: unit.trim(),
        date,
      });
      setEvent('');
      setValue('');
      setUnit('');
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to record personal best', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Record Personal Best</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div>
            <Label htmlFor="pb-event">Event <span className="text-destructive">*</span></Label>
            <Input
              id="pb-event"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="e.g. 100m Sprint"
            />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="pb-value">Value <span className="text-destructive">*</span></Label>
              <Input
                id="pb-value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 11.5"
              />
            </div>
            <div>
              <Label htmlFor="pb-unit">Unit <span className="text-destructive">*</span></Label>
              <Input
                id="pb-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. seconds"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pb-date">Date</Label>
            <Input
              id="pb-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !event.trim() || !value || !unit.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
