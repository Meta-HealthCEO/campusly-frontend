'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileText, Plus } from 'lucide-react';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { PayrollRunList } from '@/components/payroll';

export default function PayrollRunsPage() {
  const router = useRouter();
  const { runs, loading, fetchRuns } = usePayrollRuns();
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const year = filterYear !== 'all' ? Number(filterYear) : undefined;
    const status = filterStatus !== 'all' ? filterStatus : undefined;
    fetchRuns(year, status);
  }, [filterYear, filterStatus, fetchRuns]);

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Runs" description="View and manage monthly payroll runs">
        <Link href="/admin/payroll/runs/new">
          <Button><Plus className="h-4 w-4 mr-1" /> New Run</Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterYear} onValueChange={(v: unknown) => setFilterYear(v as string)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v: unknown) => setFilterStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingSpinner /> : runs.length === 0 ? (
        <EmptyState icon={FileText} title="No payroll runs" description="Create your first payroll run." />
      ) : (
        <PayrollRunList runs={runs} onViewRun={(id) => router.push(`/admin/payroll/runs/${id}`)} />
      )}
    </div>
  );
}
