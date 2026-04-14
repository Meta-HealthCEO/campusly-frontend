'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DAYS, DAY_LABELS, COLOR_PALETTE,
  getSubjectId, getSubjectName, getClassName,
} from '@/components/timetable/timetable-helpers';
import type { TimetableSlot, DayOfWeek } from '@/types';
import type { TimetableConfig } from '@/types/timetable-builder';

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
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const todayDay = (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const)[now.getDay()];

  // Auto-scroll to today on mount
  const todayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timeout = setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="lg:hidden space-y-4">
      {DAYS.map((day) => {
        const isToday = day === todayDay;
        return (
          <div
            key={day}
            ref={isToday ? todayRef : undefined}
            className="rounded-lg border border-border"
          >
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
                        className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 ${subjectColorMap.get(getSubjectId(slot)) ?? COLOR_PALETTE[0]}`}
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
