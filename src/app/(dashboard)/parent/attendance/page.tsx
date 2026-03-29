'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  CalendarCheck, CalendarX, Clock, UserCheck, BarChart3,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { mockStudents, mockAttendance } from '@/lib/mock-data';
import type { Attendance } from '@/types';

const parentChildren = mockStudents.slice(0, 2);

const statusStyles: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-amber-100 text-amber-800',
  excused: 'bg-blue-100 text-blue-800',
};

const statusIcons: Record<string, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
};

const attendanceColumns: ColumnDef<Attendance, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date, 'EEEE, dd MMM yyyy'),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="secondary" className={statusStyles[status] ?? ''}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'period',
    header: 'Period',
    cell: ({ row }) =>
      row.original.period ? `Period ${row.original.period}` : 'Full Day',
  },
  {
    accessorKey: 'note',
    header: 'Note',
    cell: ({ row }) => row.original.note || '-',
  },
];

function getAttendanceSummary(studentId: string) {
  const records = mockAttendance.filter((a) => a.studentId === studentId);
  const total = records.length;
  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const excused = records.filter((r) => r.status === 'excused').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return { total, present, absent, late, excused, rate };
}

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="View your children's attendance records and statistics."
      />

      <Tabs defaultValue={parentChildren[0]?.id ?? ''}>
        <TabsList>
          {parentChildren.map((child) => (
            <TabsTrigger key={child.id} value={child.id}>
              {child.user.firstName} {child.user.lastName}
            </TabsTrigger>
          ))}
        </TabsList>

        {parentChildren.map((child) => {
          const records = mockAttendance.filter(
            (a) => a.studentId === child.id
          );
          const summary = getAttendanceSummary(child.id);

          return (
            <TabsContent key={child.id} value={child.id} className="space-y-6">
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  title="Total Days"
                  value={String(summary.total)}
                  icon={CalendarCheck}
                  description="Days recorded"
                />
                <StatCard
                  title="Present"
                  value={String(summary.present)}
                  icon={UserCheck}
                  description={`${summary.rate}% attendance`}
                />
                <StatCard
                  title="Absent"
                  value={String(summary.absent)}
                  icon={CalendarX}
                  description={summary.absent > 0 ? 'Days missed' : 'No absences'}
                />
                <StatCard
                  title="Late"
                  value={String(summary.late)}
                  icon={Clock}
                  description={summary.late > 0 ? 'Late arrivals' : 'Always on time'}
                />
                <StatCard
                  title="Attendance Rate"
                  value={`${summary.rate}%`}
                  icon={BarChart3}
                  description={
                    summary.rate >= 90
                      ? 'Excellent'
                      : summary.rate >= 75
                      ? 'Good'
                      : 'Needs improvement'
                  }
                />
              </div>

              {/* Visual Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">March 2025 Overview</CardTitle>
                  <CardDescription>
                    Monthly attendance at a glance for {child.user.firstName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    {Object.entries(statusStyles).map(([status, style]) => (
                      <div key={status} className="flex items-center gap-1.5">
                        <div
                          className={`h-4 w-4 rounded text-[10px] font-bold flex items-center justify-center ${style}`}
                        >
                          {statusIcons[status]}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {/* Day headers */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-muted-foreground py-1"
                        >
                          {day}
                        </div>
                      )
                    )}
                    {/* Empty cells for offset (March 2025 starts on Saturday) */}
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {/* Calendar days */}
                    {Array.from({ length: 31 }, (_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `2025-03-${String(dayNum).padStart(2, '0')}`;
                      const record = records.find((r) => r.date === dateStr);
                      const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

                      return (
                        <div
                          key={dayNum}
                          className={`h-10 rounded flex flex-col items-center justify-center text-xs ${
                            isWeekend
                              ? 'bg-muted/30 text-muted-foreground'
                              : record
                              ? statusStyles[record.status]
                              : 'bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          <span className="font-medium">{dayNum}</span>
                          {record && !isWeekend && (
                            <span className="text-[9px] font-bold">
                              {statusIcons[record.status]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Records Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attendance Records</CardTitle>
                  <CardDescription>
                    Detailed attendance history for {child.user.firstName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {records.length > 0 ? (
                    <DataTable
                      columns={attendanceColumns}
                      data={records}
                      searchKey="date"
                      searchPlaceholder="Search by date..."
                    />
                  ) : (
                    <EmptyState
                      icon={CalendarCheck}
                      title="No attendance records"
                      description="Attendance records will appear here once they are captured."
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
