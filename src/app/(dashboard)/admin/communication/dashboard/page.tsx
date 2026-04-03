'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryStatsCards } from '@/components/communication/DeliveryStatsCards';
import { DeliveryCharts } from '@/components/communication/DeliveryCharts';
import { useDeliveryStats } from '@/hooks/useCommunicationAdmin';
import { BarChart3 } from 'lucide-react';

function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DeliveryDashboardPage() {
  const { stats, loading, fetchStats } = useDeliveryStats();

  const defaultEnd = useMemo(() => toLocalDate(new Date()), []);
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toLocalDate(d);
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  useEffect(() => {
    fetchStats({ startDate, endDate });
  }, [fetchStats, startDate, endDate]);

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Dashboard" description="Message delivery statistics and cost tracking" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="space-y-1">
          <Label htmlFor="dash-start" className="text-xs">Start Date</Label>
          <Input
            id="dash-start"
            type="date"
            value={startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dash-end" className="text-xs">End Date</Label>
          <Input
            id="dash-end"
            type="date"
            value={endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !stats ? (
        <EmptyState icon={BarChart3} title="No delivery data" description="Stats will appear once messages are sent." />
      ) : (
        <>
          <DeliveryStatsCards stats={stats} />
          <DeliveryCharts stats={stats} />
        </>
      )}
    </div>
  );
}
