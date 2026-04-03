'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { usePayrollReports } from '@/hooks/usePayrollReports';
import { usePayslips } from '@/hooks/usePayslips';
import {
  PayrollSummaryCards, PayrollRunItemsTable,
  PayrollRunActions, PayrollItemAdjustDialog,
} from '@/components/payroll';
import type { PayrollItem, Adjustment } from '@/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayrollRunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { activeRun, loading, fetchRun, reviewRun, approveRun, processRun, adjustItem } = usePayrollRuns();
  const { exportBankFile } = usePayrollReports();
  const { downloadBatchPayslips } = usePayslips();
  const [adjustingItem, setAdjustingItem] = useState<PayrollItem | null>(null);

  useEffect(() => { fetchRun(id); }, [id, fetchRun]);

  const handleReview = useCallback(async () => {
    await reviewRun(id);
    await fetchRun(id);
  }, [id, reviewRun, fetchRun]);

  const handleApprove = useCallback(async () => {
    await approveRun(id);
    await fetchRun(id);
  }, [id, approveRun, fetchRun]);

  const handleProcess = useCallback(async () => {
    await processRun(id);
    await fetchRun(id);
  }, [id, processRun, fetchRun]);

  const handleExport = useCallback(async (format: 'acb' | 'csv') => {
    await exportBankFile(id, format);
  }, [id, exportBankFile]);

  const handlePayslips = useCallback(async () => {
    await downloadBatchPayslips(id);
  }, [id, downloadBatchPayslips]);

  const handleAdjust = useCallback(async (itemId: string, adjustments: Adjustment[]) => {
    await adjustItem(id, itemId, adjustments);
    await fetchRun(id);
  }, [id, adjustItem, fetchRun]);

  if (loading || !activeRun) return <LoadingSpinner />;

  const period = `${MONTH_NAMES[activeRun.month - 1]} ${activeRun.year}`;

  return (
    <div className="space-y-6">
      <PageHeader title={`Payroll Run — ${period}`} description={activeRun.description ?? undefined}>
        <Badge variant={activeRun.status === 'processed' ? 'default' : 'secondary'}>
          {activeRun.status.charAt(0).toUpperCase() + activeRun.status.slice(1)}
        </Badge>
      </PageHeader>

      <PayrollSummaryCards totals={activeRun.totals} />

      <PayrollRunActions
        run={activeRun}
        onReview={handleReview}
        onApprove={handleApprove}
        onProcess={handleProcess}
        onExportBank={handleExport}
        onGeneratePayslips={handlePayslips}
      />

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          Payroll Items ({activeRun.items.length} employees)
        </h3>
        <PayrollRunItemsTable
          items={activeRun.items}
          onAdjust={activeRun.status === 'draft' ? setAdjustingItem : undefined}
        />
      </div>

      <PayrollItemAdjustDialog
        open={!!adjustingItem}
        onOpenChange={(open) => { if (!open) setAdjustingItem(null); }}
        item={adjustingItem}
        onSubmit={handleAdjust}
      />
    </div>
  );
}
