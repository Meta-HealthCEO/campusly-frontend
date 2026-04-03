'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface FunnelData {
  applied: number;
  reviewed: number;
  interviewed: number;
  offered: number;
  accepted: number;
}

interface Props {
  data: FunnelData;
}

export function ConversionFunnelChart({ data }: Props) {
  const chartData = [
    { stage: 'Applied', value: data.applied },
    { stage: 'Reviewed', value: data.reviewed },
    { stage: 'Interviewed', value: data.interviewed },
    { stage: 'Offered', value: data.offered },
    { stage: 'Accepted', value: data.accepted },
  ];

  if (data.applied === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No application data available for the funnel chart.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="stage" width={100} />
        <Tooltip />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
