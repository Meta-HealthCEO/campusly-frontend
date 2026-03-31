'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  ClipboardList, AlertTriangle, Users, Calendar,
  CheckSquare, PenLine, BarChart3,
} from 'lucide-react';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import Link from 'next/link';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const {
    timetable, pendingHomework, absentToday,
    classCount, ungradedCount, loading,
  } = useTeacherDashboard();

  if (loading) return <LoadingSpinner />;

  const firstName = user?.firstName ?? 'Teacher';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="space-y-6">
      <PageHeader title={`Good morning, ${firstName}!`} description="Here is your teaching dashboard for today" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Classes" value={String(timetable.length)} icon={Calendar} description={`${today} schedule`} />
        <StatCard title="To Grade" value={String(ungradedCount)} icon={ClipboardList} description="Pending submissions" />
        <StatCard title="Absent Today" value={String(absentToday.length)} icon={AlertTriangle} description="Students absent" />
        <StatCard title="My Classes" value={String(classCount)} icon={Users} description="Assigned classes" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/teacher/attendance"><Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2"><CheckSquare className="h-6 w-6 text-primary" /><span>Take Attendance</span></Button></Link>
            <Link href="/teacher/homework"><Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2"><PenLine className="h-6 w-6 text-primary" /><span>Create Homework</span></Button></Link>
            <Link href="/teacher/grades"><Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2"><BarChart3 className="h-6 w-6 text-primary" /><span>View Gradebook</span></Button></Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Today&apos;s Classes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {timetable.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
            ) : (
              timetable.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">P{slot.period}</div>
                    <div>
                      <p className="text-sm font-medium">{slot.subject?.name ?? 'Subject'}</p>
                      <p className="text-xs text-muted-foreground">{slot.room}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{slot.startTime} - {slot.endTime}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Pending Grading</CardTitle>
            <Link href="/teacher/homework" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingHomework.length === 0 ? (
              <p className="text-sm text-muted-foreground">All homework has been graded. Great work!</p>
            ) : (
              pendingHomework.map((hw) => (
                <Link key={hw.id} href={`/teacher/homework/${hw.id}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{hw.title}</p>
                    <p className="text-xs text-muted-foreground">{hw.subjectName}</p>
                  </div>
                  <Badge variant="outline">{hw.gradedCount}/{hw.totalSubmissions} graded</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AnnouncementBanner limit={3} />

      {absentToday.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />Attendance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {absentToday.map((record) => (
                <div key={record.id} className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">{record.studentName}</span>
                  </div>
                  <Badge variant="destructive">Absent</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
