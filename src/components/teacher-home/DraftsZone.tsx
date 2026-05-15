import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import type { DraftItem } from '@/types';

interface DraftsZoneProps {
  items: DraftItem[];
  total: number;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

export function DraftsZone({ items, total }: DraftsZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Drafts <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drafts. Start a lesson above.</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/teacher/lessons/${item.id}`}
              className="flex items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-muted/50"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">Edited {relativeTime(item.updatedAt)}</p>
              </div>
            </Link>
          ))
        )}
        {total > items.length ? (
          <p className="pt-1 text-xs text-muted-foreground">+{total - items.length} more</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
