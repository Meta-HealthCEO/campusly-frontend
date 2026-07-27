'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import type { TimetableConfig, PeriodTime, BreakSlot } from '@/types/timetable-builder';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TimetableConfig | null;
  onSave: (data: Partial<TimetableConfig>) => Promise<void>;
  maxExistingPeriod: number;
}

import {
  TIME_RE,
  generateDefaultTimes,
  minutesToTime,
  timeToMinutes,
  validateSchedule,
} from '@/lib/period-schedule';


export function PeriodConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
  maxExistingPeriod,
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
      const sortedTimes = [...config.periodTimes].sort((a, b) => a.period - b.period);
      setPeriodCount(sortedTimes.length);
      setPeriodTimes(sortedTimes);
      setBreakSlots(
        config.breakSlots?.length
          ? [...config.breakSlots].sort((a, b) => a.afterPeriod - b.afterPeriod)
          : [],
      );
    } else {
      setPeriodCount(7);
      setPeriodTimes(generateDefaultTimes(7));
      setBreakSlots([{ afterPeriod: 3, duration: 30, label: 'Break' }]);
    }
  }, [open, config]);

  const handlePeriodCountChange = useCallback((val: unknown) => {
    const count = Number(val as string);
    if (!Number.isInteger(count) || count < 1 || count > 10) return;

    setPeriodCount(count);
    setPeriodTimes((prev) => {
      if (count > prev.length) {
        const last = prev[prev.length - 1];
        let cursor = last ? timeToMinutes(last.endTime) + 5 : 7 * 60 + 30;
        if (Number.isNaN(cursor)) cursor = 7 * 60 + 30;

        const next = [...prev];
        for (let i = prev.length + 1; i <= count; i++) {
          next.push({ period: i, startTime: minutesToTime(cursor), endTime: minutesToTime(cursor + 45) });
          cursor += 50;
        }
        return next;
      }

      return prev.slice(0, count).map((pt, index) => ({ ...pt, period: index + 1 }));
    });
    setBreakSlots((prev) => prev.filter((b) => b.afterPeriod < count));
  }, []);

  const updateTime = useCallback((index: number, field: 'startTime' | 'endTime', value: string) => {
    setPeriodTimes((prev) => prev.map((pt, i) => (i === index ? { ...pt, [field]: value } : pt)));
  }, []);

  const addBreak = useCallback(() => {
    setBreakSlots((prev) => {
      const used = new Set(prev.map((b) => b.afterPeriod));
      const afterPeriod = Array.from({ length: Math.max(periodCount - 1, 0) }, (_, i) => i + 1)
        .find((period) => !used.has(period));
      if (!afterPeriod) return prev;
      return [...prev, { afterPeriod, duration: 15, label: 'Break' }];
    });
  }, [periodCount]);

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
      return `You have timetable entries above P${periodCount}. Those entries will be hidden until the period count is restored or the entries are moved.`;
    }
    return null;
  }, [periodCount, maxExistingPeriod]);

  const validationError = useMemo(
    () => validateSchedule(periodTimes, breakSlots, periodCount),
    [periodTimes, breakSlots, periodCount],
  );

  const handleSave = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const periodsPerDay = {
        monday: periodCount,
        tuesday: periodCount,
        wednesday: periodCount,
        thursday: periodCount,
        friday: periodCount,
      };
      const cleanedBreaks = breakSlots
        .map((b) => ({ ...b, label: b.label.trim() }))
        .sort((a, b) => a.afterPeriod - b.afterPeriod);
      await onSave({ periodsPerDay, periodTimes, breakSlots: cleanedBreaks });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Teaching Day</DialogTitle>
          <DialogDescription>
            Set the number of periods and their times. This applies to all weekdays.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
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

          {orphanWarning && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{orphanWarning}</span>
            </div>
          )}

          {validationError && (
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="space-y-3">
            <Label>Period times</Label>
            {periodTimes.map((pt, i) => (
              <div key={pt.period} className="flex items-center gap-2">
                <span className="w-8 text-sm text-muted-foreground shrink-0">P{pt.period}</span>
                <Input
                  type="time"
                  value={pt.startTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTime(i, 'startTime', e.target.value)}
                  className="w-full sm:w-28"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={pt.endTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTime(i, 'endTime', e.target.value)}
                  className="w-full sm:w-28"
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Breaks</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBreak}
                disabled={breakSlots.length >= periodCount - 1}
              >
                Add Break
              </Button>
            </div>
            {breakSlots.map((b, i) => (
              <div key={`${b.afterPeriod}-${i}`} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Input
                  value={b.label}
                  placeholder="Label"
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
                    type="number"
                    min={5}
                    max={90}
                    value={b.duration}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBreak(i, 'duration', Number(e.target.value))}
                    className="w-full sm:w-20"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBreak(i)}
                  aria-label="Remove break"
                >
                  <X className="h-4 w-4" />
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
          <Button onClick={handleSave} disabled={saving || Boolean(validationError)}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
