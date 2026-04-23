'use client';

import { useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { AuditFilterBar } from '@/components/audit/AuditFilterBar';
import { AuditTable } from '@/components/audit/AuditTable';
import { AuditExportButton } from '@/components/audit/AuditExportButton';
import { useAuditStore } from '@/stores/useAuditStore';
import { useAuditApi } from '@/hooks/useAuditApi';
import { useCan } from '@/hooks/useCan';

export default function AdminAuditPage() {
  const { resetFilters } = useAuditStore();
  const { fetchLogs } = useAuditApi();
  const canView = useCan('view_audit_log');

  useEffect(() => {
    if (!canView) return;
    resetFilters();
    fetchLogs();
  }, [canView, fetchLogs, resetFilters]);

  if (!canView) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Access denied"
        description="You don't have permission to view audit logs."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="View all activity performed within your school. Logs are retained for 90 days."
      >
        <AuditExportButton />
      </PageHeader>

      <AuditFilterBar />

      <AuditTable />
    </div>
  );
}
