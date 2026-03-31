'use client';

import { Bus, Users, AlertTriangle, LogIn } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { BusRoute, TransportAssignment, TransportAlert, BoardingLog } from '@/hooks/useTransport';

interface TransportStatCardsProps {
  routes: BusRoute[];
  assignments: TransportAssignment[];
  alerts: TransportAlert[];
  boardingLogs: BoardingLog[];
}

export function TransportStatCards({
  routes,
  assignments,
  alerts,
  boardingLogs,
}: TransportStatCardsProps) {
  const activeRoutes = routes.filter((r) => r.isActive).length;
  const unresolvedAlerts = alerts.filter((a) => !a.isResolved).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Routes"
        value={String(activeRoutes)}
        icon={Bus}
        description={`${routes.length} total routes`}
      />
      <StatCard
        title="Students Assigned"
        value={String(assignments.length)}
        icon={Users}
        description="Current assignments"
      />
      <StatCard
        title="Unresolved Alerts"
        value={String(unresolvedAlerts)}
        icon={AlertTriangle}
        description={`${alerts.length} total alerts`}
      />
      <StatCard
        title="Today's Boardings"
        value={String(boardingLogs.length)}
        icon={LogIn}
        description={`${boardingLogs.filter((l) => l.alightedAt).length} alighted`}
      />
    </div>
  );
}
