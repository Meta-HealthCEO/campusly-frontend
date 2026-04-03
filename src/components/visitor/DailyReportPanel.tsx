'use client';

import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users, Clock, LogOut as LogOutIcon, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DailyVisitorReport } from '@/types';

interface DailyReportPanelProps {
  report: DailyVisitorReport | null;
  loading: boolean;
}

export function DailyReportPanel({ report, loading }: DailyReportPanelProps) {
  if (loading) return <LoadingSpinner />;
  if (!report) return <EmptyState icon={FileText} title="No report data" description="Select a date to view the daily report." />;

  const { visitors, lateArrivals, earlyDepartures, preRegistrations } = report;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Visitors"
          value={String(visitors.totalCheckedIn)}
          icon={Users}
          description={`${visitors.checkedOut} checked out`}
        />
        <StatCard
          title="On Premises"
          value={String(visitors.currentlyOnPremises)}
          icon={Users}
          className="border-emerald-200 dark:border-emerald-800"
        />
        <StatCard
          title="Late Arrivals"
          value={String(lateArrivals.total)}
          icon={Clock}
          description={lateArrivals.total > 0 ? `Avg ${lateArrivals.averageMinutesLate} min late` : undefined}
        />
        <StatCard
          title="Early Departures"
          value={String(earlyDepartures.total)}
          icon={LogOutIcon}
        />
      </div>

      {/* Purpose breakdown */}
      {visitors.byPurpose.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Visitors by Purpose</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
              {visitors.byPurpose.map((item) => (
                <div key={item.purpose} className="flex justify-between text-sm p-2 rounded bg-muted">
                  <span className="capitalize">{item.purpose.replace('_', ' ')}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Late arrivals by reason */}
      {lateArrivals.byReason.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Late Arrivals by Reason</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
              {lateArrivals.byReason.map((item) => (
                <div key={item.reason} className="flex justify-between text-sm p-2 rounded bg-muted">
                  <span className="capitalize">{item.reason}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pre-registrations summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Pre-Registrations</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
            <div className="flex justify-between text-sm p-2 rounded bg-muted">
              <span>Expected</span>
              <span className="font-medium">{preRegistrations.expected}</span>
            </div>
            <div className="flex justify-between text-sm p-2 rounded bg-muted">
              <span>Arrived</span>
              <span className="font-medium">{preRegistrations.arrived}</span>
            </div>
            <div className="flex justify-between text-sm p-2 rounded bg-muted">
              <span>No Show</span>
              <span className="font-medium">{preRegistrations.noShow}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
