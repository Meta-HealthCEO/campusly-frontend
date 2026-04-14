'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TimetableSlot } from '@/types';
import type { TimetableConfig, PeriodTime } from '@/types/timetable-builder';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri',
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

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

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

export function TimetableGrid({ config, timetable, onSlotClick }: Props) {
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

  // Current period indicator (updates every minute)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const currentDay = (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const)[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const currentPeriod = useMemo(() => {
    if (!DAYS.includes(currentDay as DayOfWeek)) return null;
    for (const pt of periodTimes) {
      if (nowMinutes >= parseTimeToMinutes(pt.startTime) && nowMinutes < parseTimeToMinutes(pt.endTime)) {
        return pt.period;
      }
    }
    return null;
  }, [currentDay, nowMinutes, periodTimes]);

  return (
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-20 border border-border bg-muted p-2 text-left text-muted-foreground">
              Time
            </th>
            {DAYS.map((day) => (
              <th key={day} className="border border-border bg-muted p-2 text-center font-medium">
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodTimes.map((pt) => (
            <PeriodRow
              key={pt.period}
              periodTime={pt}
              days={DAYS}
              slotMap={slotMap}
              subjectColorMap={subjectColorMap}
              breakAfterSet={breakAfterSet}
              breakSlots={config.breakSlots}
              currentPeriod={currentPeriod}
              currentDay={currentDay}
              onSlotClick={onSlotClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-component: PeriodRow (keeps main component under 350 lines)
// ────────────────────────────────────────────────────────────────────────────

interface PeriodRowProps {
  periodTime: PeriodTime;
  days: DayOfWeek[];
  slotMap: Map<string, TimetableSlot>;
  subjectColorMap: Map<string, string>;
  breakAfterSet: Set<number>;
  breakSlots: TimetableConfig['breakSlots'];
  currentPeriod: number | null;
  currentDay: string;
  onSlotClick: (day: DayOfWeek, period: number, slot: TimetableSlot | null) => void;
}

function PeriodRow({
  periodTime, days, slotMap, subjectColorMap, breakAfterSet, breakSlots,
  currentPeriod, currentDay, onSlotClick,
}: PeriodRowProps) {
  const isCurrentPeriod = currentPeriod === periodTime.period;
  const breakInfo = breakAfterSet.has(periodTime.period)
    ? breakSlots.find((b) => b.afterPeriod === periodTime.period)
    : null;

  return (
    <>
      <tr>
        <td className="border border-border p-2 text-xs text-muted-foreground whitespace-nowrap">
          <div className="font-medium">P{periodTime.period}</div>
          <div>{periodTime.startTime}–{periodTime.endTime}</div>
        </td>
        {days.map((day) => {
          const slot = slotMap.get(`${day}-${periodTime.period}`) ?? null;
          const isNow = isCurrentPeriod && day === currentDay;
          return (
            <td
              key={day}
              className={`border border-border p-1 ${isNow ? 'ring-2 ring-primary ring-inset' : ''}`}
            >
              {slot ? (
                <button
                  type="button"
                  onClick={() => onSlotClick(day, periodTime.period, slot)}
                  className={`w-full rounded-md p-2 text-left transition-all hover:ring-2 hover:ring-primary/50 ${subjectColorMap.get(getSubjectId(slot)) ?? COLORS[0]}`}
                >
                  <div className="font-medium truncate">{getSubjectName(slot)}</div>
                  {getClassName(slot) && (
                    <div className="text-xs opacity-80 truncate">{getClassName(slot)}</div>
                  )}
                  {slot.room && (
                    <div className="text-xs opacity-60 truncate">{slot.room}</div>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSlotClick(day, periodTime.period, null)}
                  className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </td>
          );
        })}
      </tr>
      {breakInfo && (
        <tr>
          <td colSpan={6} className="border border-border bg-muted/50 px-3 py-1.5 text-center text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {breakInfo.label} ({breakInfo.duration} min)
            </Badge>
          </td>
        </tr>
      )}
    </>
  );
}
