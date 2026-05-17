import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import type { GradingItem } from '@/types';

interface GradingZoneProps {
  items: GradingItem[];
  total: number;
}

export function GradingZone({ items, total }: GradingZoneProps) {
  const overflow = total - items.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Grading
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <CheckCircle2 className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground text-center">All caught up. 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/teacher/homework/${item.id}`}
                className="flex items-center justify-between gap-3 border-l-2 border-l-transparent p-3 pl-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.subject ? (
                    <p className="truncate text-xs text-muted-foreground">{item.subject}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {item.gradedCount}/{item.totalSubmissions} graded
                </Badge>
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
