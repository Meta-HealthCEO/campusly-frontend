'use client';

import { StatCard } from '@/components/shared/StatCard';
import { Users, DollarSign, TrendingUp, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PayrollTotals } from '@/types';

interface PayrollSummaryCardsProps {
  totals: PayrollTotals | null;
}

export function PayrollSummaryCards({ totals }: PayrollSummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Payroll Cost"
        value={totals ? formatCurrency(totals.grossPay) : 'R0.00'}
        icon={DollarSign}
      />
      <StatCard
        title="Total Net Pay"
        value={totals ? formatCurrency(totals.totalNetPay) : 'R0.00'}
        icon={TrendingUp}
      />
      <StatCard
        title="Employees"
        value={String(totals?.employeeCount ?? 0)}
        icon={Users}
      />
      <StatCard
        title="Total PAYE"
        value={totals ? formatCurrency(totals.totalPAYE) : 'R0.00'}
        icon={Calculator}
      />
    </div>
  );
}
