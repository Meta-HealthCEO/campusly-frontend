'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AuditFilterBar } from '@/components/audit/AuditFilterBar';
import { AuditTable } from '@/components/audit/AuditTable';
import { AuditExportButton } from '@/components/audit/AuditExportButton';
import { AuditSchoolSelector } from '@/components/audit/AuditSchoolSelector';
import { useAuditStore } from '@/stores/useAuditStore';
import { useAuditApi } from '@/hooks/useAuditApi';

export default function SuperAdminAuditPage() {
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
        description="Platform-wide activity log. Select a school to filter by tenant."
      >
        <AuditExportButton />
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3">
        <AuditSchoolSelector />
        <AuditFilterBar />
      </div>

      <AuditTable />
    </div>
  );
}
