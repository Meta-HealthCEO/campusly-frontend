'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import type { TimetableConfig, PeriodTime, BreakSlot } from '@/types/timetable-builder';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TimetableConfig | null;
  onSave: (data: Partial<TimetableConfig>) => Promise<void>;
  maxExistingPeriod: number;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateDefaultTimes(count: number): PeriodTime[] {
  const times: PeriodTime[] = [];
  let cursor = 7 * 60 + 30; // 07:30
  for (let i = 1; i <= count; i++) {
    const start = cursor;
    const end = start + 45;
    times.push({ period: i, startTime: minutesToTime(start), endTime: minutesToTime(end) });
    cursor = end + 5;
    if (i === 3) cursor += 25; // break after period 3
  }
  return times;
}

export function PeriodConfigDialog({
  open, onOpenChange, config, onSave, maxExistingPeriod,
}: Props) {
  const [periodCount, setPeriodCount] = useState(7);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(generateDefaultTimes(7));
  const [breakSlots, setBreakSlots] = useState<BreakSlot[]>([
    { afterPeriod: 3, duration: 30, label: 'Break' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (config && config.periodTimes.length > 0) {
      setPeriodCount(config.periodTimes.length);
      setPeriodTimes([...config.periodTimes]);
      setBreakSlots(config.breakSlots?.length ? [...config.breakSlots] : []);
    } else {
      setPeriodCount(7);
      setPeriodTimes(generateDefaultTimes(7));
      setBreakSlots([{ afterPeriod: 3, duration: 30, label: 'Break' }]);
    }
  }, [open, config]);

  const handlePeriodCountChange = useCallback((val: unknown) => {
    const count = Number(val as string);
    setPeriodCount(count);
    setPeriodTimes((prev) => {
      if (count > prev.length) {
        const last = prev[prev.length - 1];
        let cursor = last ? timeToMinutes(last.endTime) + 5 : 7 * 60 + 30;
        const next = [...prev];
        for (let i = prev.length + 1; i <= count; i++) {
          next.push({ period: i, startTime: minutesToTime(cursor), endTime: minutesToTime(cursor + 45) });
          cursor += 50;
        }
        return next;
      }
      return prev.slice(0, count);
    });
    setBreakSlots((prev) => prev.filter((b) => b.afterPeriod < count));
  }, []);

  const updateTime = useCallback((index: number, field: 'startTime' | 'endTime', value: string) => {
    setPeriodTimes((prev) => prev.map((pt, i) => (i === index ? { ...pt, [field]: value } : pt)));
  }, []);

  const addBreak = useCallback(() => {
    setBreakSlots((prev) => [...prev, { afterPeriod: 1, duration: 15, label: 'Break' }]);
  }, []);

  const removeBreak = useCallback((index: number) => {
    setBreakSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateBreak = useCallback((index: number, field: keyof BreakSlot, value: string | number) => {
    setBreakSlots((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
  }, []);

  const orphanWarning = useMemo(() => {
    if (periodCount < maxExistingPeriod) {
      return `You have timetable entries in periods above P${periodCount} that will no longer appear. Those entries will be hidden but not deleted.`;
    }
    return null;
  }, [periodCount, maxExistingPeriod]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const periodsPerDay = {
        monday: periodCount, tuesday: periodCount, wednesday: periodCount,
        thursday: periodCount, friday: periodCount,
      };
      await onSave({ periodsPerDay, periodTimes, breakSlots });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure School Day</DialogTitle>
          <DialogDescription>
            Set the number of periods and their times. This applies to all weekdays.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Period count */}
          <div className="space-y-2">
            <Label>Periods per day</Label>
            <Select value={String(periodCount)} onValueChange={handlePeriodCountChange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orphan warning */}
          {orphanWarning && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{orphanWarning}</span>
            </div>
          )}

          {/* Period times */}
          <div className="space-y-3">
            <Label>Period times</Label>
            {periodTimes.map((pt, i) => (
              <div key={pt.period} className="flex items-center gap-2">
                <span className="w-8 text-sm text-muted-foreground shrink-0">P{pt.period}</span>
                <Input
                  type="time" value={pt.startTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTime(i, 'startTime', e.target.value)}
                  className="w-full sm:w-28"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="time" value={pt.endTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTime(i, 'endTime', e.target.value)}
                  className="w-full sm:w-28"
                />
              </div>
            ))}
          </div>

          {/* Break slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Breaks</Label>
              <Button type="button" variant="outline" size="sm" onClick={addBreak}>
                Add Break
              </Button>
            </div>
            {breakSlots.map((b, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Input
                  value={b.label} placeholder="Label"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBreak(i, 'label', e.target.value)}
                  className="w-full sm:w-28"
                />
                <Select
                  value={String(b.afterPeriod)}
                  onValueChange={(v: unknown) => updateBreak(i, 'afterPeriod', Number(v as string))}
                >
                  <SelectTrigger className="w-full sm:w-28">
                    <SelectValue placeholder="After P..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: periodCount - 1 }, (_, j) => j + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>After P{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Input
                    type="number" min={5} max={60} value={b.duration}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBreak(i, 'duration', Number(e.target.value))}
                    className="w-full sm:w-20"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeBreak(i)}>
                  ✕
                </Button>
              </div>
            ))}
            {breakSlots.length === 0 && (
              <p className="text-sm text-muted-foreground">No breaks configured.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
