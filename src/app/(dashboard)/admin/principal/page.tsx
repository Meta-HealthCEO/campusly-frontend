'use client';

import { useEffect } from 'react';
import { Crown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  KpiCards,
  SubjectHeatmap,
  TermTrendCharts,
  RiskAlertsList,
  FinancialHealthPanel,
  TeacherPerformanceChart,
} from '@/components/principal';
import { usePrincipalDashboard } from '@/hooks/usePrincipalDashboard';

export default function PrincipalDashboardPage() {
  const {
    kpis,
    trends,
    subjectHeatmap,
    teacherPerformance,
    financialHealth,
    riskAlerts,
    loading,
    error,
    fetchAll,
  } = usePrincipalDashboard();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <EmptyState
        icon={Crown}
        title="Failed to load dashboard"
        description={error}
      />
    );
  }

  const hasNoData = !kpis && !trends && subjectHeatmap.length === 0;

  if (hasNoData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Principal Dashboard" description="Strategic overview of your school" />
        <EmptyState
          icon={Crown}
          title="No data available"
          description="Data will appear once academic, attendance, and fee records are created."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Principal Dashboard" description="Strategic overview of your school" />

      {/* Risk Alerts at top */}
      {riskAlerts && riskAlerts.alerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Risk Alerts</h2>
          <RiskAlertsList alerts={riskAlerts.alerts} />
        </section>
      )}

      {/* KPI Cards */}
      {kpis && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Key Performance Indicators</h2>
          <KpiCards kpis={kpis} />
        </section>
      )}

      {/* Term Trends */}
      {trends && (
        <section>
          <TermTrendCharts data={trends} />
        </section>
      )}

      {/* Subject Heatmap */}
      <section>
        <SubjectHeatmap data={subjectHeatmap} />
      </section>

      {/* Teacher Performance */}
      <section>
        <TeacherPerformanceChart data={teacherPerformance} />
      </section>

      {/* Financial Health */}
      {financialHealth && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Financial Health</h2>
          <FinancialHealthPanel data={financialHealth} />
        </section>
      )}
    </div>
  );
}
