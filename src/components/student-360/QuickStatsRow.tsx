'use client';

import { StatCard } from '@/components/shared/StatCard';
import { BookOpen, Wallet, Library, CreditCard, ClipboardCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { FullStudent360Data } from '@/types/student-360';

interface QuickStatsRowProps {
  data: FullStudent360Data;
}

export function QuickStatsRow({ data }: QuickStatsRowProps) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        title="Homework"
        value={`${data.homework.completed}`}
        icon={BookOpen}
        description={`${data.homework.pending} pending`}
      />
      <StatCard
        title="Avg Mark"
        value={`${data.homework.averageMark}%`}
        icon={ClipboardCheck}
        description="On graded work"
      />
      <StatCard
        title="Wallet"
        value={formatCurrency(data.wallet.balance)}
        icon={Wallet}
        description="Current balance"
      />
      <StatCard
        title="Library"
        value={`${data.library.borrowed}`}
        icon={Library}
        description={data.library.overdue > 0 ? `${data.library.overdue} overdue` : 'No overdue'}
      />
      <StatCard
        title="Fees"
        value={formatCurrency(data.fees.outstanding)}
        icon={CreditCard}
        description={data.fees.outstanding > 0 ? 'Outstanding' : 'All paid'}
      />
    </div>
  );
}
