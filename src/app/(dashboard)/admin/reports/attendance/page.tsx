'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PieChartComponent, BarChartComponent } from '@/components/charts';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { ExportButton } from '@/components/reports/ExportButton';
import { ClassSelector } from '@/components/reports/ClassSelector';
import { useReports } from '@/hooks/useReports';
import type { AttendanceStatusCount } from '@/hooks/useReports';

const STATUS_COLORS: Record<string, string> = {
  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
  excused: '#6366F1',
};

function toPieData(data: AttendanceStatusCount[]) {
  return data.map((d) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: d.count,
    color: STATUS_COLORS[d.status] ?? '#94A3B8',
  }));
}

function toBarData(data: AttendanceStatusCount[]) {
  return data.map((d) => ({
    status: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    count: d.count,
  }));
}

export default function AttendanceReportPage() {
  const router = useRouter();
  const { loading, fetchAttendance } = useReports();
  const [data, setData] = useState<AttendanceStatusCount[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [classId, setClassId] = useState('');

  const loadData = useCallback(async () => {
    const result = await fetchAttendance({ startDate, endDate, classId });
    setData(result);
  }, [fetchAttendance, startDate, endDate, classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRecords = data.reduce((sum, d) => sum + d.count, 0);
  const presentCount = data.find((d) => d.status === 'present')?.count ?? 0;
  const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : '0.0';

  const exportData = data.map((d) => ({
    Status: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    Count: d.count,
    Percentage: totalRecords > 0 ? ((d.count / totalRecords) * 100).toFixed(1) + '%' : '0%',
  }));

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setClassId('');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Report" description="Attendance breakdown by status">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/reports')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onReset={handleReset}
      >
        <ClassSelector value={classId} onChange={setClassId} />
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="attendance-report"
          columns={[
            { key: 'Status', header: 'Status' },
            { key: 'Count', header: 'Count' },
            { key: 'Percentage', header: 'Percentage' },
          ]}
        />
      </DateRangeFilter>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{attendanceRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Absent Count</p>
                <p className="text-2xl font-bold text-destructive">
                  {data.find((d) => d.status === 'absent')?.count ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {data.length > 0 ? (
                  <PieChartComponent data={toPieData(data)} height={300} />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No attendance data for the selected filters.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Counts</CardTitle>
              </CardHeader>
              <CardContent>
                {data.length > 0 ? (
                  <BarChartComponent
                    data={toBarData(data) as Record<string, unknown>[]}
                    xKey="status"
                    bars={[{ key: 'count', color: '#2563EB', name: 'Count' }]}
                    height={300}
                  />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No attendance data for the selected filters.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
