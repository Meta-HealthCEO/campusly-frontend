import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GradingItem } from '@/types';

interface GradingZoneProps {
  items: GradingItem[];
  total: number;
}

export function GradingZone({ items, total }: GradingZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Grading <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up. 🎉</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/teacher/homework/${item.id}`}
              className="flex items-center justify-between gap-3 rounded-md border p-2.5 transition-colors hover:bg-muted/50"
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
          ))
        )}
        {total > items.length ? (
          <p className="pt-1 text-xs text-muted-foreground">+{total - items.length} more</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
