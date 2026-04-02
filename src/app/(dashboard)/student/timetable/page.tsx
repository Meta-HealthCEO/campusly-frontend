'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useStudentTimetable } from '@/hooks/useStudentTimetable';
import { cn } from '@/lib/utils';
import type { TimetableSlot } from '@/types';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const dayLabels: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday',
};

const colorPalette = [
  'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300',
  'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300',
  'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300',
  'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300',
  'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300',
  'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300',
  'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300',
];

export default function StudentTimetablePage() {
  const { timetable, loading } = useStudentTimetable();

  if (loading) return <LoadingSpinner />;

  // Build subject color map
  const subjectIds = [...new Set(timetable.map((s) => {
    if (typeof s.subjectId === 'string') return s.subjectId;
    return (s.subjectId as unknown as { _id?: string })?._id ?? '';
  }))];
  const subjectColors: Record<string, string> = {};
  subjectIds.forEach((id, i) => { subjectColors[id] = colorPalette[i % colorPalette.length]; });

  const periods = [...new Set(timetable.map((s) => s.period))].sort((a, b) => a - b);
  if (periods.length === 0) for (let i = 1; i <= 6; i++) periods.push(i);

  const getSlot = (day: string, period: number) => timetable.find((s) => s.day === day && s.period === period);
  const getSubjectId = (slot: TimetableSlot) => typeof slot.subjectId === 'string' ? slot.subjectId : (slot.subjectId as unknown as { _id?: string })?._id ?? '';
  const getSubjectName = (slot: TimetableSlot) => slot.subject?.name ?? 'Subject';

  return (
    <div className="space-y-6">
      <PageHeader title="Weekly Timetable" description="Your class schedule for the week" />

      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground w-20">Period</th>
                  {days.map((day) => (<th key={day} className="p-3 text-left text-sm font-medium text-muted-foreground min-w-[120px]">{dayLabels[day]}</th>))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="text-sm font-medium">P{period}</div>
                      <div className="text-xs text-muted-foreground">
                        {getSlot('monday', period)?.startTime ?? ''} - {getSlot('monday', period)?.endTime ?? ''}
                      </div>
                    </td>
                    {days.map((day) => {
                      const slot = getSlot(day, period);
                      if (!slot) return (
                        <td key={day} className="p-2">
                          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Free</div>
                        </td>
                      );
                      return (
                        <td key={day} className="p-2">
                          <div className={cn('rounded-lg border p-3 space-y-0.5', subjectColors[getSubjectId(slot)] || 'bg-muted')}>
                            <p className="text-sm font-medium truncate">{getSubjectName(slot)}</p>
                            <p className="text-xs opacity-80 truncate">{slot.room}</p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:hidden">
        {days.map((day) => {
          const daySlots = periods.map((p) => getSlot(day, p)).filter(Boolean) as TimetableSlot[];
          if (daySlots.length === 0) return null;
          return (
            <Card key={day}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{dayLabels[day]}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {daySlots.map((slot) => (
                  <div key={`${day}-${slot.period}`} className={cn('flex items-center gap-3 rounded-lg border p-3', subjectColors[getSubjectId(slot)] || 'bg-muted')}>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/50 text-xs font-bold dark:bg-black/20">P{slot.period}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getSubjectName(slot)}</p>
                      <p className="text-xs opacity-80">{slot.room} &middot; {slot.startTime} - {slot.endTime}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
