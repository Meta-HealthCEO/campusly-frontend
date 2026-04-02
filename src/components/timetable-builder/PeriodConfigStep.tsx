'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import type { TimetableConfig, PeriodTime, BreakSlot, PeriodsPerDay } from '@/types';

const DAYS: { key: keyof PeriodsPerDay; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
];

interface PeriodConfigStepProps {
  config: TimetableConfig | null;
  onSave: (data: Partial<TimetableConfig>) => Promise<unknown>;
  onApplyDefaults: () => void;
}

export function PeriodConfigStep({ config, onSave, onApplyDefaults }: PeriodConfigStepProps) {
  const [periodsPerDay, setPeriodsPerDay] = useState<PeriodsPerDay>(
    config?.periodsPerDay ?? { monday: 7, tuesday: 7, wednesday: 7, thursday: 7, friday: 7 },
  );
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(config?.periodTimes ?? []);
  const [breakSlots, setBreakSlots] = useState<BreakSlot[]>(config?.breakSlots ?? []);
  const [academicYear, setAcademicYear] = useState(config?.academicYear ?? new Date().getFullYear());
  const [term, setTerm] = useState(config?.term ?? 1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setPeriodsPerDay(config.periodsPerDay);
      setPeriodTimes(config.periodTimes);
      setBreakSlots(config.breakSlots);
      setAcademicYear(config.academicYear);
      setTerm(config.term);
    }
  }, [config]);

  const maxPeriods = Math.max(...Object.values(periodsPerDay));

  useEffect(() => {
    setPeriodTimes((prev) => {
      if (prev.length >= maxPeriods) return prev.slice(0, maxPeriods);
      const next = [...prev];
      for (let i = prev.length; i < maxPeriods; i++) {
        next.push({ period: i + 1, startTime: '08:00', endTime: '08:45' });
      }
      return next;
    });
  }, [maxPeriods]);

  function updatePeriodTime(index: number, field: 'startTime' | 'endTime', value: string) {
    setPeriodTimes((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addBreak() {
    setBreakSlots((prev) => [...prev, { afterPeriod: 3, duration: 30, label: 'Break' }]);
  }

  function removeBreak(index: number) {
    setBreakSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ periodsPerDay, periodTimes, breakSlots, academicYear, term });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onApplyDefaults}>
          <RotateCcw className="mr-1 h-4 w-4" /> Apply Defaults
        </Button>
      </div>

      {/* Year and Term */}
      <Card>
        <CardHeader><CardTitle className="text-base">Academic Period</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Academic Year</Label>
              <Input
                type="number"
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Term</Label>
              <Input
                type="number"
                min={1}
                max={4}
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Periods per day */}
      <Card>
        <CardHeader><CardTitle className="text-base">Periods Per Day</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {DAYS.map((d) => (
              <div key={d.key}>
                <Label className="text-xs">{d.label}</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={periodsPerDay[d.key]}
                  onChange={(e) =>
                    setPeriodsPerDay((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Period times */}
      <Card>
        <CardHeader><CardTitle className="text-base">Period Times</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {periodTimes.map((pt, i) => (
              <div key={pt.period} className="flex items-center gap-3">
                <span className="w-10 text-sm font-medium">P{pt.period}</span>
                <Input
                  type="time"
                  value={pt.startTime}
                  onChange={(e) => updatePeriodTime(i, 'startTime', e.target.value)}
                  className="w-full sm:w-32"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={pt.endTime}
                  onChange={(e) => updatePeriodTime(i, 'endTime', e.target.value)}
                  className="w-full sm:w-32"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Break slots */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Breaks</CardTitle>
            <Button variant="outline" size="sm" onClick={addBreak}>
              <Plus className="mr-1 h-4 w-4" /> Add Break
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {breakSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">No breaks configured.</p>
          )}
          <div className="space-y-2">
            {breakSlots.map((bs, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs">After Period</Label>
                  <Input
                    type="number"
                    min={1}
                    max={maxPeriods}
                    value={bs.afterPeriod}
                    onChange={(e) =>
                      setBreakSlots((prev) =>
                        prev.map((b, j) => (j === i ? { ...b, afterPeriod: Number(e.target.value) } : b)),
                      )
                    }
                    className="w-full sm:w-20"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={bs.duration}
                    onChange={(e) =>
                      setBreakSlots((prev) =>
                        prev.map((b, j) => (j === i ? { ...b, duration: Number(e.target.value) } : b)),
                      )
                    }
                    className="w-full sm:w-24"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={bs.label}
                    onChange={(e) =>
                      setBreakSlots((prev) =>
                        prev.map((b, j) => (j === i ? { ...b, label: e.target.value } : b)),
                      )
                    }
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeBreak(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
