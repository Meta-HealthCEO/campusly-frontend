'use client';

import { BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent } from '@/components/charts';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import type { CashFlowPoint } from '@/types';

interface Props {
  cashFlow: CashFlowPoint[];
  loading: boolean;
}

export function CashFlowChart({ cashFlow, loading }: Props) {
  if (loading) return <LoadingSpinner />;
  if (cashFlow.length === 0) {
    return <EmptyState icon={BarChart2} title="No cash flow data" description="Select a date range to view cash flow." />;
  }

  // Convert amounts from cents to rands for display
  const chartData = cashFlow.map((point: CashFlowPoint) => ({
    date: point.date,
    Collections: Math.round(point.amount) / 100,
    'Running Total': Math.round(point.runningTotal) / 100,
  }));

  return (
    <Card>
      <CardHeader><CardTitle>Cash Flow</CardTitle></CardHeader>
      <CardContent>
        <BarChartComponent
          data={chartData}
          xKey="date"
          bars={[
            { key: 'Collections', color: '#2563EB', name: 'Daily Collections (R)' },
          ]}
          height={350}
        />
      </CardContent>
    </Card>
  );
}
