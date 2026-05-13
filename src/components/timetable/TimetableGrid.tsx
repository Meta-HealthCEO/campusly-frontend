'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DAYS,
  DAY_LABELS_SHORT,
  COLOR_PALETTE,
  getSubjectId,
  getSubjectName,
  getClassName,
  parseTimeToMinutes,
} from '@/components/timetable/timetable-helpers';
import type { TimetableSlot, DayOfWeek } from '@/types';
import type { TimetableConfig, PeriodTime } from '@/types/timetable-builder';

interface Props {
  config: TimetableConfig;
  timetable: TimetableSlot[];
  onSlotClick: (day: DayOfWeek, period: number, slot: TimetableSlot | null) => void;
  editable?: boolean;
}

export function TimetableGrid({
  config,
  timetable,
  onSlotClick,
  editable = false,
}: Props) {
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
        map.set(sid, COLOR_PALETTE[idx % COLOR_PALETTE.length]);
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
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const currentDay = (
    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  )[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const currentPeriod = useMemo(() => {
    if (!DAYS.includes(currentDay as DayOfWeek)) return null;
    for (const pt of periodTimes) {
      const start = parseTimeToMinutes(pt.startTime);
      const end = parseTimeToMinutes(pt.endTime);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      if (nowMinutes >= start && nowMinutes < end) return pt.period;
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
                {DAY_LABELS_SHORT[day]}
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
              editable={editable}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  editable: boolean;
}

function PeriodRow({
  periodTime,
  days,
  slotMap,
  subjectColorMap,
  breakAfterSet,
  breakSlots,
  currentPeriod,
  currentDay,
  onSlotClick,
  editable,
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
          <div>{periodTime.startTime}-{periodTime.endTime}</div>
        </td>
        {days.map((day) => {
          const slot = slotMap.get(`${day}-${periodTime.period}`) ?? null;
          const isNow = isCurrentPeriod && day === currentDay;
          const emptyClassName =
            'flex h-16 w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors';

          return (
            <td
              key={day}
              className={`border border-border p-1 ${isNow ? 'ring-2 ring-primary ring-inset' : ''}`}
            >
              {slot ? (
                <SlotCell
                  slot={slot}
                  colorClass={subjectColorMap.get(getSubjectId(slot)) ?? COLOR_PALETTE[0]}
                  editable={editable}
                  onClick={() => onSlotClick(day, periodTime.period, slot)}
                />
              ) : editable ? (
                <button
                  type="button"
                  onClick={() => onSlotClick(day, periodTime.period, null)}
                  className={`${emptyClassName} hover:border-primary hover:text-primary`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <div className={`${emptyClassName} opacity-50`} aria-label="Free period" />
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

function SlotCell({
  slot,
  colorClass,
  editable,
  onClick,
}: {
  slot: TimetableSlot;
  colorClass: string;
  editable: boolean;
  onClick: () => void;
}) {
  const className = `w-full rounded-md p-2 text-left transition-all ${colorClass} ${
    editable ? 'hover:ring-2 hover:ring-primary/50' : ''
  }`;
  const content = (
    <>
      <div className="font-medium truncate">{getSubjectName(slot)}</div>
      {getClassName(slot) && (
        <div className="text-xs opacity-80 truncate">{getClassName(slot)}</div>
      )}
      {slot.room && (
        <div className="text-xs opacity-60 truncate">{slot.room}</div>
      )}
    </>
  );

  if (!editable) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
