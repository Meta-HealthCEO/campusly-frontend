'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TimetableSlot } from '@/types';
import type { TimetableConfig } from '@/types/timetable-builder';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday',
};

const COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
];

function getSubjectId(slot: TimetableSlot): string {
  const sid = slot.subjectId;
  if (typeof sid === 'string') return sid;
  if (sid && typeof sid === 'object' && 'id' in sid) return String((sid as { id: string }).id);
  return '';
}

function getSubjectName(slot: TimetableSlot): string {
  if (slot.subject && typeof slot.subject === 'object' && 'name' in slot.subject) {
    return slot.subject.name;
  }
  return 'Subject';
}

function getClassName(slot: TimetableSlot): string {
  const cid = slot.classId;
  if (cid && typeof cid === 'object' && 'name' in cid) {
    return (cid as { name: string }).name;
  }
  return '';
}

interface Props {
  config: TimetableConfig;
  timetable: TimetableSlot[];
  onSlotClick: (day: DayOfWeek, period: number, slot: TimetableSlot | null) => void;
}

export function TimetableMobileView({ config, timetable, onSlotClick }: Props) {
  const periodTimes = config.periodTimes;
  const breakAfterSet = useMemo(
    () => new Set(config.breakSlots.map((b) => b.afterPeriod)),
    [config.breakSlots],
  );

  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    for (const slot of timetable) {
      const sid = getSubjectId(slot);
      if (sid && !map.has(sid)) {
        map.set(sid, COLORS[idx % COLORS.length]);
        idx++;
      }
    }
    return map;
  }, [timetable]);

  const slotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    for (const slot of timetable) {
      map.set(`${slot.day}-${slot.period}`, slot);
    }
    return map;
  }, [timetable]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const todayDay = (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const)[now.getDay()];

  return (
    <div className="lg:hidden space-y-4">
      {DAYS.map((day) => {
        const isToday = day === todayDay;
        return (
          <div key={day} className="rounded-lg border border-border">
            {/* Day header */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
              <h3 className="font-medium text-sm">{DAY_LABELS[day]}</h3>
              {isToday && <Badge variant="secondary" className="text-xs">Today</Badge>}
            </div>

            {/* Period items */}
            <div className="divide-y divide-border">
              {periodTimes.map((pt) => {
                const slot = slotMap.get(`${day}-${pt.period}`) ?? null;
                const breakInfo = breakAfterSet.has(pt.period)
                  ? config.breakSlots.find((b) => b.afterPeriod === pt.period)
                  : null;

                return (
                  <div key={pt.period}>
                    {slot ? (
                      <button
                        type="button"
                        onClick={() => onSlotClick(day, pt.period, slot)}
                        className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 ${subjectColorMap.get(getSubjectId(slot)) ?? COLORS[0]}`}
                      >
                        <div className="flex flex-col items-center shrink-0 pt-0.5">
                          <span className="text-xs font-medium opacity-70">P{pt.period}</span>
                          <Clock className="h-3 w-3 mt-0.5 opacity-50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{getSubjectName(slot)}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs opacity-80">
                            {getClassName(slot) && <span>{getClassName(slot)}</span>}
                            {slot.room && <span>{slot.room}</span>}
                            <span>{pt.startTime}–{pt.endTime}</span>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSlotClick(day, pt.period, null)}
                        className="flex w-full items-center gap-3 p-3 text-left text-muted-foreground transition-colors hover:text-primary"
                      >
                        <div className="flex flex-col items-center shrink-0">
                          <span className="text-xs font-medium">P{pt.period}</span>
                        </div>
                        <div className="flex flex-1 items-center gap-2 rounded-md border border-dashed border-border px-3 py-2">
                          <Plus className="h-4 w-4 shrink-0" />
                          <span className="text-sm">Free &middot; {pt.startTime}–{pt.endTime}</span>
                        </div>
                      </button>
                    )}

                    {breakInfo && (
                      <div className="bg-muted/30 px-4 py-1.5 text-center">
                        <Badge variant="outline" className="text-xs">
                          {breakInfo.label} ({breakInfo.duration} min)
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
