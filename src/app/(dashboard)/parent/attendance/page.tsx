'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  CalendarCheck, CalendarX, Clock, UserCheck, BarChart3,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentAttendance } from '@/hooks/useParentAttendance';
import { AttendanceCalendar } from '@/components/parent/AttendanceCalendar';
import type { Attendance } from '@/types';

const statusStyles: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-destructive/10 text-destructive',
  late: 'bg-amber-100 text-amber-800',
  excused: 'bg-blue-100 text-blue-800',
};

const attendanceColumns: ColumnDef<Attendance, unknown>[] = [
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date, 'EEEE, dd MMM yyyy') },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => <Badge variant="secondary" className={statusStyles[row.original.status] ?? ''}>{row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}</Badge>,
  },
  { accessorKey: 'period', header: 'Period', cell: ({ row }) => row.original.period ? `Period ${row.original.period}` : 'Full Day' },
  { accessorKey: 'note', header: 'Note', cell: ({ row }) => row.original.note || '-' },
];

export default function AttendancePage() {
  const { children } = useCurrentParent();
  const { childAttendance, loading } = useParentAttendance();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="View your children's attendance records and statistics." />

      <Tabs defaultValue={children[0]?.id ?? ''}>
        <TabsList>
          {childAttendance.map((ca) => (
            <TabsTrigger key={ca.childId} value={ca.childId}>{ca.firstName} {ca.lastName}</TabsTrigger>
          ))}
        </TabsList>

        {childAttendance.map((ca) => (
          <TabsContent key={ca.childId} value={ca.childId} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <StatCard title="Total Days" value={String(ca.total)} icon={CalendarCheck} description="Days recorded" />
              <StatCard title="Present" value={String(ca.present)} icon={UserCheck} description={`${ca.rate}% attendance`} />
              <StatCard title="Absent" value={String(ca.absent)} icon={CalendarX} description={ca.absent > 0 ? 'Days missed' : 'No absences'} />
              <StatCard title="Late" value={String(ca.late)} icon={Clock} description={ca.late > 0 ? 'Late arrivals' : 'Always on time'} />
              <StatCard title="Attendance Rate" value={`${ca.rate}%`} icon={BarChart3} description={ca.rate >= 90 ? 'Excellent' : ca.rate >= 75 ? 'Good' : 'Needs improvement'} />
            </div>

            <AttendanceCalendar
              records={ca.records}
              childName={ca.firstName}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance Records</CardTitle>
                <CardDescription>Detailed attendance history for {ca.firstName}</CardDescription>
              </CardHeader>
              <CardContent>
                {ca.records.length > 0 ? (
                  <DataTable columns={attendanceColumns} data={ca.records} searchKey="date" searchPlaceholder="Search by date..." />
                ) : (
                  <EmptyState icon={CalendarCheck} title="No attendance records" description="Attendance records will appear here once they are captured." />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
