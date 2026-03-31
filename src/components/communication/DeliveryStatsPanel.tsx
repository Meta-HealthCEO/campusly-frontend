'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from './MessageBadges';
import type { DeliveryStatEntry } from './types';

interface DeliveryStatsPanelProps {
  stats: DeliveryStatEntry[];
  loading?: boolean;
}

export function DeliveryStatsPanel({ stats, loading }: DeliveryStatsPanelProps) {
  if (loading) return <LoadingSpinner size="sm" />;

  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delivery Stats</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No delivery data available.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.status}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <StatusBadge status={stat.status} />
                  <span className="text-lg font-bold">{stat.count}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Total: {totalCount} recipient{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
