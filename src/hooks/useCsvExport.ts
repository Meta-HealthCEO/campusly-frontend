import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';

interface UseCsvExportOptions {
  endpoint: string;
  filename: string;
  params?: Record<string, string>;
}

interface UseCsvExportResult {
  exportCsv: () => Promise<void>;
  loading: boolean;
}

export function useCsvExport({ endpoint, filename, params }: UseCsvExportOptions): UseCsvExportResult {
  const [loading, setLoading] = useState(false);

  const exportCsv = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(endpoint, {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('CSV export failed:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, filename, params]);

  return { exportCsv, loading };
}
