'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import type { PolicyComplianceSummary } from '@/types';

interface PolicyComplianceTableProps {
  compliance: PolicyComplianceSummary;
}

export function PolicyComplianceTable({ compliance }: PolicyComplianceTableProps) {
  if (compliance.totalPolicies === 0) {
    return <EmptyState icon={Shield} title="No policies" description="No policy documents have been uploaded yet." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Policies" value={String(compliance.totalPolicies)} icon={Shield} />
        <StatCard title="Up to Date" value={String(compliance.upToDate)} icon={CheckCircle} />
        <StatCard title="Due for Review" value={String(compliance.dueForReview)} icon={Clock} />
        <StatCard title="Overdue" value={String(compliance.overdue)} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Review Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Policy</th>
                  <th className="text-left py-2 pr-4 font-medium">Review Date</th>
                  <th className="text-left py-2 pr-4 font-medium">Status</th>
                  <th className="text-right py-2 font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {compliance.policies.map((policy) => (
                  <tr key={policy.documentId} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <span className="truncate block max-w-[200px]">{policy.title}</span>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {policy.policyReviewDate
                        ? new Date(policy.policyReviewDate).toLocaleDateString('en-ZA')
                        : 'No date set'}
                    </td>
                    <td className="py-2 pr-4">
                      {policy.status === 'up_to_date' && <Badge variant="secondary">Up to Date</Badge>}
                      {policy.status === 'due_for_review' && <Badge variant="outline">Due for Review</Badge>}
                      {policy.status === 'overdue' && <Badge variant="destructive">Overdue</Badge>}
                    </td>
                    <td className="py-2 text-right">
                      {policy.status === 'overdue' && (
                        <span className="text-destructive font-medium">{policy.daysPastDue}d overdue</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
