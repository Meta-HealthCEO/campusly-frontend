'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent, LineChartComponent } from '@/components/charts';
import type { DeliveryStats } from '@/types';

interface DeliveryChartsProps {
  stats: DeliveryStats;
}

export function DeliveryCharts({ stats }: DeliveryChartsProps) {
  const channelData = stats.byChannel.map((c) => ({
    channel: c.channel.charAt(0).toUpperCase() + c.channel.slice(1),
    Delivered: c.delivered,
    Failed: c.failed,
    Cost: c.cost,
  }));

  const dailyData = stats.byDay.map((d) => ({
    date: d.date.slice(5), // MM-DD
    Sent: d.sent,
    Delivered: d.delivered,
  }));

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChartComponent
            data={channelData}
            xKey="channel"
            bars={[
              { key: 'Delivered', color: '#10B981', name: 'Delivered' },
              { key: 'Failed', color: '#EF4444', name: 'Failed' },
            ]}
            height={260}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChartComponent
            data={dailyData}
            xKey="date"
            lines={[
              { key: 'Sent', color: '#2563EB', name: 'Sent' },
              { key: 'Delivered', color: '#10B981', name: 'Delivered' },
            ]}
            height={260}
          />
        </CardContent>
      </Card>
    </div>
  );
}
