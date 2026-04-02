'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TeacherAvailability,
  TeacherAvailabilityEntry,
  TimetableConfig,
  Teacher,
} from '@/types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const DAY_SHORT: Record<string, string> = {
  monday: 'M', tuesday: 'T', wednesday: 'W', thursday: 'Th', friday: 'F',
};

function teacherName(t: Teacher): string {
  return `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || 'Unknown';
}

interface TeacherAvailabilityStepProps {
  availability: TeacherAvailability[];
  teachers: Teacher[];
  config: TimetableConfig | null;
  onSave: (teacherId: string, unavailable: TeacherAvailabilityEntry[]) => Promise<unknown>;
}

export function TeacherAvailabilityStep({
  availability,
  teachers,
  config,
  onSave,
}: TeacherAvailabilityStepProps) {
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [localUnavailable, setLocalUnavailable] = useState<Map<string, TeacherAvailabilityEntry[]>>(
    new Map(),
  );

  const maxPeriods = useMemo(() => {
    if (!config) return 7;
    return Math.max(...Object.values(config.periodsPerDay));
  }, [config]);

  const periods = useMemo(
    () => Array.from({ length: maxPeriods }, (_, i) => i + 1),
    [maxPeriods],
  );

  const getUnavailable = useCallback(
    (teacherId: string): TeacherAvailabilityEntry[] => {
      if (localUnavailable.has(teacherId)) return localUnavailable.get(teacherId)!;
      const entry = availability.find((a) => a.teacherId === teacherId);
      return entry?.unavailable ?? [];
    },
    [availability, localUnavailable],
  );

  const isUnavailable = useCallback(
    (teacherId: string, day: string, period: number): boolean => {
      const entries = getUnavailable(teacherId);
      return entries.some((e) => e.day === day && e.periods.includes(period));
    },
    [getUnavailable],
  );

  function toggleCell(teacherId: string, day: string, period: number) {
    const current = getUnavailable(teacherId);
    const dayEntry = current.find((e) => e.day === day);
    let updated: TeacherAvailabilityEntry[];

    if (dayEntry) {
      if (dayEntry.periods.includes(period)) {
        const newPeriods = dayEntry.periods.filter((p) => p !== period);
        updated = newPeriods.length > 0
          ? current.map((e) => (e.day === day ? { ...e, periods: newPeriods } : e))
          : current.filter((e) => e.day !== day);
      } else {
        updated = current.map((e) =>
          e.day === day ? { ...e, periods: [...e.periods, period].sort() } : e,
        );
      }
    } else {
      updated = [...current, { day, periods: [period] }];
    }

    setLocalUnavailable((prev) => new Map(prev).set(teacherId, updated));
  }

  function bulkMarkAfternoons(day: string, fromPeriod: number) {
    teachers.forEach((teacher) => {
      const current = getUnavailable(teacher.id);
      const afternoonPeriods = periods.filter((p) => p >= fromPeriod);
      const dayEntry = current.find((e) => e.day === day);
      let updated: TeacherAvailabilityEntry[];

      if (dayEntry) {
        const merged = [...new Set([...dayEntry.periods, ...afternoonPeriods])].sort();
        updated = current.map((e) => (e.day === day ? { ...e, periods: merged } : e));
      } else {
        updated = [...current, { day, periods: afternoonPeriods }];
      }
      setLocalUnavailable((prev) => new Map(prev).set(teacher.id, updated));
    });
  }

  async function handleSaveTeacher(teacherId: string) {
    const entries = getUnavailable(teacherId);
    await onSave(teacherId, entries);
    setLocalUnavailable((prev) => {
      const next = new Map(prev);
      next.delete(teacherId);
      return next;
    });
  }

  if (teachers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No teachers found"
        description="Add staff members before configuring availability."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => bulkMarkAfternoons('wednesday', 5)}
        >
          Mark Wed P5+ unavailable
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teacher Availability Grid</CardTitle>
          <p className="text-xs text-muted-foreground">
            Click cells to toggle availability. Red = unavailable.
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left font-medium sticky left-0 bg-background z-10">
                  Teacher
                </th>
                {DAYS.map((day) =>
                  periods.map((p) => (
                    <th key={`${day}-${p}`} className="p-1 text-center font-medium min-w-8">
                      <span className="block">{DAY_SHORT[day]}</span>
                      <span className="block text-muted-foreground">{p}</span>
                    </th>
                  )),
                )}
                <th className="p-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => {
                const isExpanded = expandedTeacher === teacher.id;
                const hasChanges = localUnavailable.has(teacher.id);
                return (
                  <tr key={teacher.id} className="border-b last:border-0">
                    <td
                      className="p-2 font-medium sticky left-0 bg-background z-10 cursor-pointer truncate max-w-32"
                      onClick={() =>
                        setExpandedTeacher(isExpanded ? null : teacher.id)
                      }
                    >
                      {teacherName(teacher)}
                    </td>
                    {DAYS.map((day) =>
                      periods.map((p) => {
                        const unavail = isUnavailable(teacher.id, day, p);
                        return (
                          <td key={`${day}-${p}`} className="p-0">
                            <button
                              onClick={() => toggleCell(teacher.id, day, p)}
                              className={cn(
                                'w-full h-8 border transition-colors',
                                unavail
                                  ? 'bg-destructive/20 border-destructive/30 hover:bg-destructive/30'
                                  : 'bg-background hover:bg-muted/50 border-transparent',
                              )}
                              aria-label={`${teacherName(teacher)} ${day} period ${p}: ${unavail ? 'unavailable' : 'available'}`}
                            />
                          </td>
                        );
                      }),
                    )}
                    <td className="p-1">
                      {hasChanges && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleSaveTeacher(teacher.id)}
                        >
                          Save
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
