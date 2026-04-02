'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AuditFilterBar } from '@/components/audit/AuditFilterBar';
import { AuditTable } from '@/components/audit/AuditTable';
import { AuditExportButton } from '@/components/audit/AuditExportButton';
import { useAuditStore } from '@/stores/useAuditStore';
import { useAuditApi } from '@/hooks/useAuditApi';

export default function AdminAuditPage() {
  const { resetFilters } = useAuditStore();
  const { fetchLogs } = useAuditApi();

  useEffect(() => {
    resetFilters();
    fetchLogs();
  }, [fetchLogs, resetFilters]);

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
