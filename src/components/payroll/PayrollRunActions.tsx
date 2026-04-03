'use client';

import { useState } from 'react';
import { ClipboardCheck, CheckCircle, CreditCard, Download, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PayrollRun, PayrollRunStatus } from '@/types';

interface PayrollRunActionsProps {
  run: PayrollRun;
  onReview: () => Promise<void>;
  onApprove: () => Promise<void>;
  onProcess: () => Promise<void>;
  onExportBank: (format: 'acb' | 'csv') => Promise<void>;
  onGeneratePayslips: () => Promise<void>;
}

type LoadingKey = 'review' | 'approve' | 'process' | 'exportAcb' | 'exportCsv' | 'payslips';

const STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: 'Draft',
  reviewed: 'Reviewed',
  approved: 'Approved',
  processed: 'Processed',
};

const STATUS_VARIANTS: Record<PayrollRunStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  draft: 'outline',
  reviewed: 'secondary',
  approved: 'default',
  processed: 'secondary',
};

export function PayrollRunActions({
  run,
  onReview,
  onApprove,
  onProcess,
  onExportBank,
  onGeneratePayslips,
}: PayrollRunActionsProps) {
  const [loading, setLoading] = useState<Partial<Record<LoadingKey, boolean>>>({});
  const [exportOpen, setExportOpen] = useState(false);

  const { status } = run;

  const withLoading = (key: LoadingKey, action: () => Promise<void>) => async () => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await action();
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleExport = (format: 'acb' | 'csv') => {
    const key: LoadingKey = format === 'acb' ? 'exportAcb' : 'exportCsv';
    setExportOpen(false);
    void withLoading(key, () => onExportBank(format))();
  };

  const canExportOrPayslip = status === 'approved' || status === 'processed';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>

      {status === 'draft' && (
        <Button
          variant="outline"
          onClick={withLoading('review', onReview)}
          disabled={loading.review}
        >
          <ClipboardCheck />
          {loading.review ? 'Saving…' : 'Mark as Reviewed'}
        </Button>
      )}

      {status === 'reviewed' && (
        <Button
          variant="outline"
          onClick={withLoading('approve', onApprove)}
          disabled={loading.approve}
        >
          <CheckCircle />
          {loading.approve ? 'Approving…' : 'Approve'}
        </Button>
      )}

      {status === 'approved' && (
        <Button
          variant="outline"
          onClick={withLoading('process', onProcess)}
          disabled={loading.process}
        >
          <CreditCard />
          {loading.process ? 'Processing…' : 'Mark as Processed'}
        </Button>
      )}

      {canExportOrPayslip && (
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setExportOpen((prev) => !prev)}
            disabled={loading.exportAcb || loading.exportCsv}
          >
            <Download />
            {loading.exportAcb || loading.exportCsv ? 'Exporting…' : 'Export Bank File'}
            <ChevronDown className="ml-1" />
          </Button>
          {exportOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 min-w-[10rem] rounded-lg border border-border bg-background py-1 shadow-md">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => handleExport('acb')}
                disabled={!!loading.exportAcb}
              >
                <Download className="size-4" />
                ACB Format
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => handleExport('csv')}
                disabled={!!loading.exportCsv}
              >
                <Download className="size-4" />
                CSV Format
              </button>
            </div>
          )}
        </div>
      )}

      {canExportOrPayslip && (
        <Button
          variant="outline"
          onClick={withLoading('payslips', onGeneratePayslips)}
          disabled={loading.payslips}
        >
          <FileText />
          {loading.payslips ? 'Generating…' : 'Generate Payslips'}
        </Button>
      )}
    </div>
  );
}
