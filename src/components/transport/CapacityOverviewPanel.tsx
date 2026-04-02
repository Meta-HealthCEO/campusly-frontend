'use client';

import { Bus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { RouteCapacityBadge } from './RouteCapacityBadge';

export interface RouteCapacityStat {
  routeId: string;
  routeName: string;
  capacity: number;
  assignedCount: number;
  availableSpots: number;
  utilisationPercent: number;
}

interface CapacityOverviewPanelProps {
  capacityData: RouteCapacityStat[];
  loading: boolean;
}

export function CapacityOverviewPanel({ capacityData, loading }: CapacityOverviewPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (capacityData.length === 0) {
    return <EmptyState icon={Bus} title="No routes" description="No active routes with capacity data." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Route Capacity Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {capacityData.map((route) => {
          const pct = route.utilisationPercent;
          const barColor =
            pct >= 90
              ? 'bg-destructive'
              : pct >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500';

          return (
            <div key={route.routeId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">{route.routeName}</span>
                <RouteCapacityBadge assignedCount={route.assignedCount} capacity={route.capacity} />
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {route.availableSpots} spot{route.availableSpots !== 1 ? 's' : ''} available ({pct}% full)
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
