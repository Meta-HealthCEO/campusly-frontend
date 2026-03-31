'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChartComponent } from '@/components/charts';
import { formatCurrency } from '@/lib/utils';

interface MonthlyRevenue {
  _id: { year: number; month: number };
  revenue: number;
  invoiceCount: number;
}

interface RevenueChartProps {
  monthly: MonthlyRevenue[];
  loading?: boolean;
}

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function RevenueChart({ monthly, loading }: RevenueChartProps) {
  const chartData = monthly
    .sort((a, b) => {
      if (a._id.year !== b._id.year) return a._id.year - b._id.year;
      return a._id.month - b._id.month;
    })
    .map((m) => ({
      month: `${MONTH_LABELS[m._id.month]} ${m._id.year}`,
      revenue: Math.round(m.revenue * 100),
    }));

  if (loading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = chartData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Revenue Trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(total)}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <AreaChartComponent
          data={chartData as Record<string, unknown>[]}
          xKey="month"
          areas={[{ key: 'revenue', color: '#2563EB', name: 'Revenue (R)' }]}
        />
      </CardContent>
    </Card>
  );
}
