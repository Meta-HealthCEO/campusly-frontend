'use client';

import { useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { CaseloadDashboard } from '@/components/pastoral/CaseloadDashboard';
import { ReferralReasonChart, OutcomeChart } from '@/components/pastoral';
import { ShieldAlert } from 'lucide-react';
import { usePastoralCare } from '@/hooks/usePastoralCare';

export default function AdminPastoralPage() {
  const {
    caseload,
    caseloadLoading,
    fetchCaseload,
    report,
    reportLoading,
    fetchReport,
  } = usePastoralCare();

  const loadAll = useCallback(async () => {
    await Promise.allSettled([fetchCaseload(), fetchReport()]);
  }, [fetchCaseload, fetchReport]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const isLoading = caseloadLoading || reportLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pastoral Care Overview"
        description="School-wide counselor caseload and referral analytics — read only."
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <CaseloadDashboard caseload={caseload} />

          {report ? (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <ReferralReasonChart report={report} />
              <OutcomeChart report={report} />
            </div>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No report data available"
              description="Pastoral care report data will appear here once records exist."
            />
          )}
        </>
      )}
    </div>
  );
}
