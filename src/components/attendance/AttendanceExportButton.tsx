'use client';

import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useAttendanceExport } from '@/hooks/useAttendanceExport';

interface AttendanceExportButtonProps {
  classId: string | null;
  period: number;
  dateFrom: string;   // YYYY-MM-DD (same as dateTo for single-day register)
  dateTo: string;
  filename: string;
}

export function AttendanceExportButton({ classId, period, dateFrom, dateTo, filename }: AttendanceExportButtonProps) {
  const { exportPdf, exporting } = useAttendanceExport();
  const disabled = !classId || exporting;

  return (
    <Button
      variant="outline"
      onClick={() => {
        if (!classId) return;
        void exportPdf({ classId, period, dateFrom, dateTo, filename });
      }}
      disabled={disabled}
    >
      {exporting
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : <FileDown className="mr-2 h-4 w-4" />}
      {exporting ? 'Generating…' : 'Export PDF'}
    </Button>
  );
}
