import { StatCard } from '@/components/shared/StatCard';
import { DollarSign, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PaymentAnalytics } from '@/types';

interface PaymentAnalyticsCardsProps {
  analytics: PaymentAnalytics;
}

export function PaymentAnalyticsCards({ analytics }: PaymentAnalyticsCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today"
          value={formatCurrency(analytics.todayTotal)}
          icon={DollarSign}
          description="Collected today"
        />
        <StatCard
          title="This Week"
          value={formatCurrency(analytics.weekTotal)}
          icon={TrendingUp}
          description="Weekly collections"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(analytics.monthTotal)}
          icon={Calendar}
          description="Monthly collections"
        />
        <StatCard
          title="Failed Payments"
          value={String(analytics.failedCount)}
          icon={AlertTriangle}
          description={analytics.failedCount > 0 ? 'Requires attention' : 'No failures'}
        />
      </div>

      {analytics.methodBreakdown.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-medium mb-3">Payment Method Breakdown</h4>
          <div className="space-y-2">
            {analytics.methodBreakdown.map((item) => (
              <div key={item.method} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{item.method}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{item.count} payments</span>
                  <span className="font-medium w-28 text-right">{formatCurrency(item.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
