'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, AlertTriangle, Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { anyCategoryLabel } from '@/lib/behaviour';
import { meritPointsLabel, demeritPointsLabel } from '@/lib/learner-profile';
import type { FullStudent360Data } from '@/types/student-360';

interface RecentActivityCardProps {
  achievements: FullStudent360Data['achievements'];
  /** Left out on the teacher's profile, which shows the behaviour timeline instead. */
  behaviour?: FullStudent360Data['behaviour'];
  sports: FullStudent360Data['sports'];
}

interface ActivityItem {
  id: string;
  icon: 'achievement' | 'incident' | 'sport';
  title: string;
  subtitle: string;
  date: string;
  badge: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
}

export function RecentActivityCard({ achievements, behaviour, sports }: RecentActivityCardProps) {
  const items: ActivityItem[] = useMemo(() => {
    const list: ActivityItem[] = [];

    for (const a of achievements.recent) {
      list.push({
        id: `ach-${a.title}-${a.date}`,
        icon: 'achievement',
        title: a.title,
        subtitle: `${a.type} achievement`,
        date: a.date,
        badge: { label: `+${a.points} pts`, variant: 'secondary' },
      });
    }

    for (const i of behaviour?.recentIncidents ?? []) {
      list.push({
        id: `inc-${i.type}-${i.date}`,
        icon: 'incident',
        title: anyCategoryLabel(i.type),
        subtitle: i.description.length > 80 ? `${i.description.slice(0, 80)}...` : i.description,
        date: i.date,
        badge: {
          label: i.severity,
          variant: i.severity === 'critical' || i.severity === 'serious' || i.severity === 'high' ? 'destructive' : 'outline',
        },
      });
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [achievements, behaviour]);

  const hasNoActivity = items.length === 0 && sports.cards.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <div className="flex gap-2">
            {achievements.totalMerits > 0 && (
              <Badge variant="success">
                {meritPointsLabel(achievements.totalMerits)}
              </Badge>
            )}
            {achievements.totalDemerits > 0 && (
              <Badge variant="destructive">
                {demeritPointsLabel(achievements.totalDemerits)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasNoActivity ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Sport cards summary */}
            {sports.cards.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-full bg-muted p-2">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Sports</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {sports.cards.map((c) => `${c.sportCode} (${c.tier})`).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Activity feed */}
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div
                  className={`rounded-full p-2 shrink-0 ${
                    item.icon === 'achievement'
                      ? 'bg-muted'
                      : 'bg-muted'
                  }`}
                >
                  {item.icon === 'achievement' ? (
                    <Trophy className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium capitalize truncate">{item.title}</p>
                    <Badge variant={item.badge.variant} className="text-[10px] px-1.5 py-0 shrink-0">
                      {item.badge.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.subtitle}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
