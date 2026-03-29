'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import {
  ClipboardList,
  BookOpen,
  AlertTriangle,
  Users,
  Calendar,
  CheckSquare,
  PenLine,
  BarChart3,
} from 'lucide-react';
import {
  mockTimetable,
  mockHomework,
  mockSubmissions,
  mockAttendance,
  mockStudents,
  mockTeachers,
} from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

// Current teacher is t1
const currentTeacher = mockTeachers[0];

// Today's classes (monday)
const todayClasses = mockTimetable
  .filter((slot) => slot.day === 'monday' && slot.teacherId === currentTeacher.id)
  .sort((a, b) => a.period - b.period);

// Pending homework to grade
const pendingToGrade = mockHomework.filter((hw) => {
  if (hw.teacherId !== currentTeacher.id) return false;
  const submissions = mockSubmissions.filter(
    (s) => s.homeworkId === hw.id && s.status === 'submitted'
  );
  return submissions.length > 0;
});

const ungradedCount = mockSubmissions.filter(
  (s) => s.status === 'submitted'
).length;

// Absent students today
const todayDate = '2025-03-06';
const absentToday = mockAttendance.filter(
  (a) => a.date === todayDate && a.status === 'absent'
);

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good morning, {currentTeacher.user.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Here is your teaching dashboard for today
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Classes"
          value={String(todayClasses.length)}
          icon={Calendar}
          description="Monday schedule"
        />
        <StatCard
          title="To Grade"
          value={String(ungradedCount)}
          icon={ClipboardList}
          description="Pending submissions"
        />
        <StatCard
          title="Absent Today"
          value={String(absentToday.length)}
          icon={AlertTriangle}
          description="Students absent"
        />
        <StatCard
          title="My Classes"
          value={String(currentTeacher.classIds.length)}
          icon={Users}
          description="Assigned classes"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/teacher/attendance">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <CheckSquare className="h-6 w-6 text-primary" />
                <span>Take Attendance</span>
              </Button>
            </Link>
            <Link href="/teacher/homework">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <PenLine className="h-6 w-6 text-primary" />
                <span>Create Homework</span>
              </Button>
            </Link>
            <Link href="/teacher/grades">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span>View Gradebook</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes scheduled for today.
              </p>
            ) : (
              todayClasses.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      P{slot.period}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{slot.subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {slot.room}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Homework to Grade */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Pending Grading</CardTitle>
            <Link
              href="/teacher/homework"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingToGrade.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All homework has been graded. Great work!
              </p>
            ) : (
              pendingToGrade.map((hw) => {
                const submissionCount = mockSubmissions.filter(
                  (s) => s.homeworkId === hw.id
                ).length;
                const gradedCount = mockSubmissions.filter(
                  (s) => s.homeworkId === hw.id && s.status === 'graded'
                ).length;

                return (
                  <Link
                    key={hw.id}
                    href={`/teacher/homework/${hw.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{hw.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {hw.subject.name}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {gradedCount}/{submissionCount} graded
                    </Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Alerts */}
      {absentToday.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Attendance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {absentToday.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">
                      {record.student.user.firstName}{' '}
                      {record.student.user.lastName}
                    </span>
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
