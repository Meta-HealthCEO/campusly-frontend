import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, BookOpen, CalendarCheck } from 'lucide-react';
import type { TodayItem } from '@/types';

interface TodayZoneProps {
  items: TodayItem[];
  total: number;
}

const ICON_BY_KIND = {
  homework: ClipboardList,
  lesson: BookOpen,
} as const;

const HREF_PREFIX_BY_KIND = {
  homework: '/teacher/homework',
  lesson: '/teacher/lessons',
} as const;

function itemTime(item: TodayItem): string {
  const iso = item.kind === 'homework' ? item.dueDate : item.scheduledDate;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export function TodayZone({ items, total }: TodayZoneProps) {
  const overflow = total - items.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Today
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <CalendarCheck className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground text-center">
              Nothing due today. A good day to make something new ✨
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item) => {
              const Icon = ICON_BY_KIND[item.kind];
              const time = itemTime(item);
              return (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={`${HREF_PREFIX_BY_KIND[item.kind]}/${item.id}`}
                  className="flex items-center gap-3 border-l-2 border-l-transparent p-3 pl-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.subject ? (
                      <p className="truncate text-xs text-muted-foreground">{item.subject}</p>
                    ) : null}
                  </div>
                  {time ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
        {overflow > 0 ? (
          <div className="flex justify-end pt-3">
            <span className="inline-flex h-5 items-center rounded-full bg-muted/60 px-2 text-xs text-muted-foreground">
              + {overflow} more
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
