'use client';

import { Users, Clock, AlertTriangle, CalendarCheck } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { CounselorCaseload } from '@/types';

interface Props {
  caseload: CounselorCaseload | null;
}

export function CaseloadDashboard({ caseload }: Props) {
  const overdue = caseload?.overdueFollowUps ?? 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Cases"
        value={String(caseload?.activeCases ?? 0)}
        icon={Users}
        description="Currently open referrals"
      />
      <StatCard
        title="Pending Referrals"
        value={String(caseload?.pendingReferrals ?? 0)}
        icon={Clock}
        description="Awaiting acknowledgement"
      />
      <StatCard
        title="Overdue Follow-Ups"
        value={String(overdue)}
        icon={AlertTriangle}
        description="Past scheduled follow-up date"
        className={overdue > 0 ? 'border-destructive/40' : undefined}
      />
      <StatCard
        title="Sessions This Week"
        value={String(caseload?.sessionsThisWeek ?? 0)}
        icon={CalendarCheck}
        description={`${caseload?.sessionsThisMonth ?? 0} this month`}
      />
    </div>
  );
}
