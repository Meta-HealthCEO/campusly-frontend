'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { mockTimetable, mockSubjects } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const dayLabels: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

// Assign consistent colors to subjects
const subjectColors: Record<string, string> = {
  sub1: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300',
  sub2: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300',
  sub3: 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300',
  sub4: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300',
  sub5: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300',
  sub6: 'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300',
  sub7: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300',
};

const periods = [1, 2, 3, 4, 5, 6];

export default function StudentTimetablePage() {
  const getSlot = (day: string, period: number) => {
    return mockTimetable.find((s) => s.day === day && s.period === period);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Timetable"
        description="Your class schedule for the week"
      />

      {/* Desktop grid view */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground w-20">
                    Period
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="p-3 text-left text-sm font-medium text-muted-foreground"
                    >
                      {dayLabels[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="text-sm font-medium">P{period}</div>
                      <div className="text-xs text-muted-foreground">
                        {getSlot('monday', period)?.startTime} -{' '}
                        {getSlot('monday', period)?.endTime}
                      </div>
                    </td>
                    {days.map((day) => {
                      const slot = getSlot(day, period);
                      if (!slot) {
                        return (
                          <td key={day} className="p-2">
                            <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                              Free
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={day} className="p-2">
                          <div
                            className={cn(
                              'rounded-lg border p-3 space-y-0.5',
                              subjectColors[slot.subjectId] || 'bg-muted'
                            )}
                          >
                            <p className="text-sm font-medium">
                              {slot.subject.name}
                            </p>
                            <p className="text-xs opacity-80">{slot.room}</p>
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

      {/* Mobile card view */}
      <div className="space-y-4 lg:hidden">
        {days.map((day) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{dayLabels[day]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {periods.map((period) => {
                const slot = getSlot(day, period);
                if (!slot) return null;
                return (
                  <div
                    key={period}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3',
                      subjectColors[slot.subjectId] || 'bg-muted'
                    )}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/50 text-xs font-bold dark:bg-black/20">
                      P{period}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{slot.subject.name}</p>
                      <p className="text-xs opacity-80">
                        {slot.room} &middot; {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
