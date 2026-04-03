'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatCard } from '@/components/shared/StatCard';
import { EnrollmentByGradeChart, EnrollmentTrendChart } from '@/components/sgb';
import { useSgbEnrollment } from '@/hooks/useSgbEnrollment';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, TrendingUp, UserPlus } from 'lucide-react';
import { PieChartComponent } from '@/components/charts';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function SgbEnrollmentPage() {
  const [year, setYear] = useState(currentYear);
  const { summary, loading } = useSgbEnrollment(year);

  if (loading) return <LoadingSpinner />;

  const genderData = summary ? [
    { name: 'Male', value: summary.genderSplit.male, color: '#2563EB' },
    { name: 'Female', value: summary.genderSplit.female, color: '#EC4899' },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Enrollment Statistics" description="Student enrollment overview for SGB">
        <Select value={String(year)} onValueChange={(val: unknown) => setYear(Number(val))}>
          <SelectTrigger className="w-full sm:w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {summary && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Students" value={String(summary.totalStudents)} icon={GraduationCap} />
            <StatCard title="New Enrollments" value={String(summary.newEnrollments)} icon={UserPlus} />
            <StatCard title="Departures" value={String(summary.departures)} icon={Users} />
            <StatCard title="Net Change" value={`+${summary.netChange}`} icon={TrendingUp} />
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <EnrollmentByGradeChart grades={summary.byGrade} />
            <EnrollmentTrendChart data={summary.yearOverYear} />
          </div>

          {genderData.length > 0 && (
            <div className="max-w-md">
              <PieChartComponent data={genderData} height={250} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
