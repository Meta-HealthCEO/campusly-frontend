import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';

interface ExportArgs {
  classId: string;
  period: number;
  dateFrom: string;   // YYYY-MM-DD
  dateTo: string;     // YYYY-MM-DD (same as dateFrom for single-day register)
  filename: string;
}

export function useAttendanceExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async (args: ExportArgs) => {
    setExporting(true);
    try {
      const res = await apiClient.get('/attendance/export', {
        params: {
          classId: args.classId,
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          period: args.period,
          format: 'pdf',
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = args.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not export PDF'));
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportPdf, exporting };
}
