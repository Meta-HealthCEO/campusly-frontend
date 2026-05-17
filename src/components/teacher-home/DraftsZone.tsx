import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, PenLine } from 'lucide-react';
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
  const overflow = total - items.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Drafts
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <PenLine className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground text-center">No drafts. Start a lesson above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/teacher/lessons/${item.id}`}
                className="flex items-center gap-3 border-l-2 border-l-transparent p-3 pl-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">Edited {relativeTime(item.updatedAt)}</p>
                </div>
              </Link>
            ))}
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
