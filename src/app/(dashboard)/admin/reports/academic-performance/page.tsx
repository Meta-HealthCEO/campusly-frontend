'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BarChartComponent } from '@/components/charts';
import { ExportButton } from '@/components/reports/ExportButton';
import { TermAcademicYearFilter } from '@/components/reports/TermAcademicYearFilter';
import { useReports } from '@/hooks/useReports';
import type { AcademicPerformanceEntry } from '@/hooks/useReports';

const PASS_THRESHOLD = 50;

export default function AcademicPerformanceReportPage() {
  const router = useRouter();
  const { loading, fetchAcademicPerformance } = useReports();
  const [data, setData] = useState<AcademicPerformanceEntry[]>([]);
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const loadData = useCallback(async () => {
    const result = await fetchAcademicPerformance({ term, academicYear });
    setData(result);
  }, [fetchAcademicPerformance, term, academicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = data.map((d) => ({
    subject: d.subjectCode || d.subjectName,
    averagePercentage: d.averagePercentage,
    totalMarks: d.totalMarks,
    fullName: d.subjectName,
  }));

  const belowThreshold = data.filter((d) => d.averagePercentage < PASS_THRESHOLD);
  const overallAvg =
    data.length > 0
      ? (data.reduce((sum, d) => sum + d.averagePercentage, 0) / data.length).toFixed(1)
      : '0.0';

  const exportData = data.map((d) => ({
    Subject: d.subjectName,
    Code: d.subjectCode,
    'Average %': d.averagePercentage,
    'Total Marks': d.totalMarks,
  }));

  const handleReset = () => {
    setTerm('');
    setAcademicYear('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Performance"
        description="Subject averages across the school"
      >
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/reports')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3">
        <TermAcademicYearFilter
          term={term}
          academicYear={academicYear}
          onTermChange={setTerm}
          onAcademicYearChange={setAcademicYear}
          onReset={handleReset}
        />
        <ExportButton
          data={exportData as Record<string, unknown>[]}
          filename="academic-performance-report"
          columns={[
            { key: 'Subject', header: 'Subject' },
            { key: 'Code', header: 'Code' },
            { key: 'Average %', header: 'Average %' },
            { key: 'Total Marks', header: 'Total Marks' },
          ]}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">School Average</p>
                <p className="text-2xl font-bold">{overallAvg}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Below {PASS_THRESHOLD}%</p>
                <p className="text-2xl font-bold text-red-600">{belowThreshold.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Average Percentage by Subject</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <BarChartComponent
                  data={chartData as Record<string, unknown>[]}
                  xKey="subject"
                  bars={[
                    { key: 'averagePercentage', color: '#2563EB', name: 'Average %' },
                  ]}
                  height={400}
                />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No academic data for the selected filters.
                </p>
              )}
            </CardContent>
          </Card>

          {belowThreshold.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-600">
                  Subjects Below Pass Threshold ({PASS_THRESHOLD}%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {belowThreshold.map((s) => (
                    <li key={s.subjectId} className="text-sm">
                      <span className="font-medium">{s.subjectName}</span> ({s.subjectCode}) —{' '}
                      <span className="text-red-600 font-semibold">{s.averagePercentage}%</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
