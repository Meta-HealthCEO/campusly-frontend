import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, BookOpen } from 'lucide-react';
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
  // Only show time if hours or minutes are non-zero (date-only sources have 00:00).
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export function TodayZone({ items, total }: TodayZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Today <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due today. A good day to make something new ✨
          </p>
        ) : (
          items.map((item) => {
            const Icon = ICON_BY_KIND[item.kind];
            const time = itemTime(item);
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={`${HREF_PREFIX_BY_KIND[item.kind]}/${item.id}`}
                className="flex items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-muted/50"
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
          })
        )}
        {total > items.length ? (
          <p className="pt-1 text-xs text-muted-foreground">+{total - items.length} more</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
