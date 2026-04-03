'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import type { PayrollRun, PayrollRunStatus } from '@/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_CONFIG: Record<PayrollRunStatus, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  reviewed: { variant: 'outline', label: 'Reviewed' },
  approved: { variant: 'default', label: 'Approved' },
  processed: { variant: 'default', label: 'Processed' },
};

interface PayslipListProps {
  runs: PayrollRun[];
  staffId: string;
  onView: (runId: string) => void;
  onDownload: (runId: string) => void;
}

export function PayslipList({ runs, onView, onDownload }: PayslipListProps) {
  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No payslips available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const cfg = STATUS_CONFIG[run.status];
        const periodLabel = `${MONTH_NAMES[run.month - 1]} ${run.year}`;

        return (
          <Card key={run.id}>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium truncate">{periodLabel}</span>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(run.id)}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(run.id)}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
