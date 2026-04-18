'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChronicAbsenteeTable } from '@/components/attendance/ChronicAbsenteeTable';
import { AttendanceStatusChart } from '@/components/attendance/AttendanceStatusChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { PatternCard } from '@/components/attendance/PatternCard';
import { useTeacherAttendanceReport } from '@/hooks/useTeacherAttendanceReport';

export default function TeacherAttendanceReportPage() {
  const {
    homeClass,
    students,
    report,
    chronicAbsentees,
    patterns,
    loading,
    loadingAbsentees,
    loadingPatterns,
    startDate,
    endDate,
    threshold,
    setDateRange,
    changeThreshold,
    loadPatterns,
  } = useTeacherAttendanceReport();

  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const handleApplyDates = () => {
    setDateRange(localStart, localEnd);
  };

  const handleStudentChange = (val: unknown) => {
    const id = val as string;
    if (id === 'none') {
      setSelectedStudentId('');
      return;
    }
    setSelectedStudentId(id);
    loadPatterns(id);
  };

  if (loading && !report) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance Report"
          description="View attendance trends and analytics for your class"
        />
        <LoadingSpinner />
      </div>
    );
  }

  if (!homeClass) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance Report"
          description="View attendance trends and analytics for your class"
        />
        <EmptyState
          icon={BarChart3}
          title="No home class assigned"
          description="You need a home class assignment to view attendance reports."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Report"
        description={`Trends and analytics for ${homeClass.name}`}
      />

      {/* Date range filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="w-full sm:w-auto">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                className="w-full sm:w-44"
                value={localStart}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLocalStart(e.target.value)
                }
              />
            </div>
            <div className="w-full sm:w-auto">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                className="w-full sm:w-44"
                value={localEnd}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLocalEnd(e.target.value)
                }
              />
            </div>
            <Button onClick={handleApplyDates} className="w-full sm:w-auto">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Records"
          value={String(report?.totalDays ?? 0)}
          icon={CalendarDays}
        />
        <StatCard
          title="Present %"
          value={`${report?.presentPercentage ?? 0}%`}
          icon={CheckCircle}
        />
        <StatCard
          title="Absent"
          value={String(report?.absentCount ?? 0)}
          icon={XCircle}
        />
        <StatCard
          title="Late"
          value={String(report?.lateCount ?? 0)}
          icon={Clock}
        />
      </div>

      {/* Status distribution pie chart */}
      <AttendanceStatusChart
        present={report?.presentCount ?? 0}
        absent={report?.absentCount ?? 0}
        late={report?.lateCount ?? 0}
        excused={report?.excusedCount ?? 0}
      />

      {/* Chronic absentees */}
      <ChronicAbsenteeTable
        absentees={chronicAbsentees}
        loading={loadingAbsentees}
        threshold={threshold}
        onThresholdChange={changeThreshold}
      />

      {/* Student patterns */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Student Patterns</CardTitle>
            <Select
              value={selectedStudentId || 'none'}
              onValueChange={handleStudentChange}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a student...</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <PatternCard
            patterns={selectedStudentId ? patterns : null}
            loading={loadingPatterns}
          />
        </CardContent>
      </Card>
    </div>
  );
}
