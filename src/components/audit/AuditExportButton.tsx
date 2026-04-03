'use client';

import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuditStore } from '@/stores/useAuditStore';
import { useAuditApi } from '@/hooks/useAuditApi';
import type { AuditLog } from '@/stores/useAuditStore';

interface AuditExportButtonProps {
  filename?: string;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvContent(logs: AuditLog[]): string {
  const headers = ['Date', 'User', 'Email', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Changes'];
  const rows = logs.map((log) => {
    const userName = log.userId
      ? `${log.userId.firstName} ${log.userId.lastName}`
      : '';
    const email = log.userId?.email ?? '';
    const changesStr = log.changes.length > 0
      ? JSON.stringify(log.changes)
      : '';
    return [
      formatDate(log.createdAt),
      userName,
      email,
      log.action,
      log.entity,
      log.entityId ?? '',
      log.ipAddress ?? '',
      changesStr,
    ].map(escapeCsvField).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AuditExportButton({ filename }: AuditExportButtonProps) {
  const { exporting } = useAuditStore();
  const { exportLogs } = useAuditApi();

  const handleExport = async () => {
    try {
      const logs = await exportLogs();
      const today = toISODate(new Date());
      const csvFilename = filename ?? `audit-log-${today}.csv`;
      const csvContent = buildCsvContent(logs);
      triggerDownload(csvContent, csvFilename);
      toast.success('Audit log exported successfully');
    } catch {
      toast.error('Failed to export audit logs');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
