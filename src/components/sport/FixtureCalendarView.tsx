'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SportFixture, SportTeamRef } from '@/types/sport';

interface FixtureCalendarViewProps {
  fixtures: SportFixture[];
  onFixtureClick: (fixture: SportFixture) => void;
}

function getTeamName(teamId: SportTeamRef | string): string {
  if (typeof teamId === 'string') return teamId;
  return teamId.name ?? '';
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function FixtureCalendarView({ fixtures, onFixtureClick }: FixtureCalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const fixturesByDay = useMemo(() => {
    const map = new Map<number, SportFixture[]>();
    for (const f of fixtures) {
      const d = new Date(f.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        existing.push(f);
        map.set(day, existing);
      }
    }
    return map;
  }, [fixtures, year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon-sm" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </h3>
        <Button variant="outline" size="icon-sm" onClick={nextMonth} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden">
        {DAY_NAMES.map((d) => (
          <div key={d} className="bg-muted px-2 py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          const dayFixtures = day ? (fixturesByDay.get(day) ?? []) : [];
          return (
            <div key={idx} className="min-h-[80px] bg-background p-1">
              {day && (
                <>
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayFixtures.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => onFixtureClick(f)}
                        className="w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Badge variant="outline" className="text-[9px] mr-0.5 px-1 py-0">
                          {f.isHome ? 'H' : 'A'}
                        </Badge>
                        {getTeamName(f.teamId)} vs {f.opponent}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
