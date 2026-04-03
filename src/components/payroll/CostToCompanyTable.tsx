'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CostToCompanyReport } from '@/types';

interface CostToCompanyTableProps {
  report: CostToCompanyReport | null;
}

export function CostToCompanyTable({ report }: CostToCompanyTableProps) {
  if (!report || report.departments.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No CTC data"
        description="No cost-to-company breakdown is available for the selected period."
      />
    );
  }

  const { departments, schoolTotal } = report;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="py-3 px-4 font-medium">Department</th>
            <th className="py-3 px-4 font-medium text-right">Headcount</th>
            <th className="py-3 px-4 font-medium text-right">Basic Salary</th>
            <th className="py-3 px-4 font-medium text-right">Allowances</th>
            <th className="py-3 px-4 font-medium text-right">Employer Contributions</th>
            <th className="py-3 px-4 font-medium text-right">Cost to Company</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.department} className="border-b hover:bg-muted/30 transition-colors">
              <td className="py-3 px-4 truncate max-w-[180px]">{d.department}</td>
              <td className="py-3 px-4 text-right">{d.headcount}</td>
              <td className="py-3 px-4 text-right">{formatCurrency(d.totalBasic)}</td>
              <td className="py-3 px-4 text-right">{formatCurrency(d.totalAllowances)}</td>
              <td className="py-3 px-4 text-right">{formatCurrency(d.totalEmployerContributions)}</td>
              <td className="py-3 px-4 text-right font-medium">{formatCurrency(d.costToCompany)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/50 font-semibold border-t-2">
            <td className="py-3 px-4">School Total</td>
            <td className="py-3 px-4 text-right">{schoolTotal.headcount}</td>
            <td className="py-3 px-4 text-right">{formatCurrency(schoolTotal.totalBasic)}</td>
            <td className="py-3 px-4 text-right">{formatCurrency(schoolTotal.totalAllowances)}</td>
            <td className="py-3 px-4 text-right">{formatCurrency(schoolTotal.totalEmployerContributions)}</td>
            <td className="py-3 px-4 text-right">{formatCurrency(schoolTotal.costToCompany)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
