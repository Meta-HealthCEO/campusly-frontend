'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCsvExport } from '@/hooks/useCsvExport';

interface ExportButtonProps {
  endpoint: string;
  filename: string;
  params?: Record<string, string>;
  label?: string;
}

export function ExportButton({ endpoint, filename, params, label = 'Export CSV' }: ExportButtonProps) {
  const { exportCsv, loading } = useCsvExport({ endpoint, filename, params });

  return (
    <Button variant="outline" onClick={exportCsv} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? 'Exporting...' : label}
    </Button>
  );
}
