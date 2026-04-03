'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConversionFunnelChart } from '@/components/admissions/ConversionFunnelChart';
import { useAdmissionsReports } from '@/hooks/useAdmissionsReports';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { AdmissionsByGrade } from '@/types/admissions';

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

export default function AdminAdmissionsReportsPage() {
  const { summary, loading, fetchSummary } = useAdmissionsReports();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) return <LoadingSpinner />;

  if (!summary) {
    return (
      <div className="space-y-4">
        <PageHeader title="Admissions Reports" />
        <p className="text-sm text-muted-foreground text-center py-8">No report data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admissions Reports" />

      {/* Summary stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Applications"
          value={summary.totalApplications}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Accepted"
          value={summary.byStatus['accepted'] ?? 0}
          icon={<CheckCircle className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Rejected"
          value={summary.byStatus['rejected'] ?? 0}
          icon={<XCircle className="h-5 w-5 text-destructive" />}
        />
        <StatCard
          title="Acceptance Rate"
          value={`${summary.acceptanceRate}%`}
          icon={<Clock className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ConversionFunnelChart data={summary.conversionFunnel} />
        </CardContent>
      </Card>

      {/* By Grade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications by Grade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Grade</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Accepted</th>
                  <th className="p-2 text-right">Rejected</th>
                  <th className="p-2 text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {summary.byGrade.map((g: AdmissionsByGrade) => (
                  <tr key={g.grade} className="border-b">
                    <td className="p-2 font-medium">{gradeLabel(g.grade)}</td>
                    <td className="p-2 text-right">{g.total}</td>
                    <td className="p-2 text-right">{g.accepted}</td>
                    <td className="p-2 text-right">{g.rejected}</td>
                    <td className="p-2 text-right">{g.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.byGrade.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No grade data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {icon}
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
