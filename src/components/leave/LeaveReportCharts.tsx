'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartComponent, PieChartComponent, LineChartComponent } from '@/components/charts';
import type { LeaveReportSummary } from '@/types';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface LeaveReportChartsProps {
  report: LeaveReportSummary;
}

export function LeaveReportCharts({ report }: LeaveReportChartsProps) {
  const byTypeData = useMemo(
    () => report.byLeaveType.map((item) => ({ name: item.type, totalDays: item.totalDays })),
    [report.byLeaveType],
  );

  const byDeptData = useMemo(
    () => report.byDepartment.map((item) => ({ name: item.department, value: item.totalDays })),
    [report.byDepartment],
  );

  const byMonthData = useMemo(
    () => report.byMonth.map((item) => ({
      month: MONTH_NAMES[item.month - 1] ?? `M${item.month}`,
      totalDays: item.totalDays,
    })),
    [report.byMonth],
  );

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <SummaryCard label="Total Requests" value={report.totalRequests} />
        <SummaryCard label="Approved" value={report.approved} />
        <SummaryCard label="Declined" value={report.declined} />
        <SummaryCard label="Pending" value={report.pending} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Days by Leave Type</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={byTypeData}
              xKey="name"
              bars={[{ key: 'totalDays', name: 'Total Days', color: '#2563EB' }]}
              height={250}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Days by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent data={byDeptData} height={250} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChartComponent
            data={byMonthData}
            xKey="month"
            lines={[{ key: 'totalDays', name: 'Total Days', color: '#4F46E5' }]}
            height={250}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
