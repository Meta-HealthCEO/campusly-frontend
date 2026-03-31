'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; header: string }[];
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;

    const keys = columns
      ? columns.map((c) => c.key)
      : Object.keys(data[0]);
    const headers = columns
      ? columns.map((c) => c.header)
      : keys;

    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = keys.map((k) => escapeCSV(row[k]));
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `${filename}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
