'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { usePayslips } from '@/hooks/usePayslips';
import { PayslipList, PayslipCard } from '@/components/payroll';

export default function MyPayslipsPage() {
  const { user } = useAuthStore();
  const userId = user?.id ?? '';
  const { runs, loading: runsLoading, fetchRuns } = usePayrollRuns();
  const { payslip, loading: payslipLoading, fetchPayslip, downloadPayslip } = usePayslips();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns(undefined, 'processed');
  }, [fetchRuns]);

  const handleView = async (runId: string) => {
    setSelectedRunId(runId);
    await fetchPayslip(runId, userId);
  };

  const handleDownload = async (runId: string) => {
    await downloadPayslip(runId, userId);
  };

  if (runsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="My Payslips" description="View and download your monthly payslips" />

      {runs.length === 0 ? (
        <EmptyState icon={FileText} title="No payslips" description="No processed payslips are available yet." />
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold mb-3">Pay Periods</h3>
            <PayslipList
              runs={runs}
              staffId={userId}
              onView={handleView}
              onDownload={handleDownload}
            />
          </div>
          <div>
            {selectedRunId && payslipLoading && <LoadingSpinner />}
            {selectedRunId && !payslipLoading && payslip && (
              <>
                <h3 className="text-lg font-semibold mb-3">Payslip Detail</h3>
                <PayslipCard payslip={payslip} />
              </>
            )}
            {!selectedRunId && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a pay period to view your payslip
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
