'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Banknote, Users, FileText, BarChart3, Settings, Plus } from 'lucide-react';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { usePayrollReports } from '@/hooks/usePayrollReports';
import { PayrollSummaryCards, PayrollRunList, CostToCompanyChart } from '@/components/payroll';

export default function PayrollDashboardPage() {
  const { runs, loading, fetchRuns } = usePayrollRuns();
  const { costToCompany, fetchCostToCompany } = usePayrollReports();

  useEffect(() => {
    fetchRuns();
    const now = new Date();
    fetchCostToCompany(now.getMonth() + 1, now.getFullYear());
  }, [fetchRuns, fetchCostToCompany]);

  const latestRun = runs.length > 0 ? runs[0] : null;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" description="Manage staff salaries and payroll runs">
        <Link href="/admin/payroll/runs/new">
          <Button><Plus className="h-4 w-4 mr-1" /> New Payroll Run</Button>
        </Link>
      </PageHeader>

      <PayrollSummaryCards totals={latestRun?.totals ?? null} />

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/admin/payroll/staff">
          <Button variant="outline" className="w-full justify-start">
            <Users className="h-4 w-4 mr-2" /> Staff Salaries
          </Button>
        </Link>
        <Link href="/admin/payroll/runs">
          <Button variant="outline" className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" /> Payroll Runs
          </Button>
        </Link>
        <Link href="/admin/payroll/reports">
          <Button variant="outline" className="w-full justify-start">
            <BarChart3 className="h-4 w-4 mr-2" /> Reports
          </Button>
        </Link>
        <Link href="/admin/payroll/tax">
          <Button variant="outline" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" /> Tax Config
          </Button>
        </Link>
      </div>

      {/* Recent Runs */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Recent Payroll Runs</h3>
        {runs.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No payroll runs"
            description="Create your first payroll run to get started."
          />
        ) : (
          <PayrollRunList
            runs={runs.slice(0, 5)}
            onViewRun={(id) => { window.location.href = `/admin/payroll/runs/${id}`; }}
          />
        )}
      </div>

      {/* CTC Overview */}
      {costToCompany && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Cost to Company</h3>
          <CostToCompanyChart report={costToCompany} />
        </div>
      )}
    </div>
  );
}
