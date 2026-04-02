'use client';

import Link from 'next/link';
import { BookOpen, Calendar, Wallet, Trophy, Clock, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { FeaturedBanner } from '@/components/school-news/FeaturedBanner';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function StudentDashboard() {
  const { student } = useCurrentStudent();
  const { homework, submissions, wallet, timetable, loading } = useStudentDashboard();

  if (loading) return <LoadingSpinner />;

  const firstName = student?.user?.firstName ?? student?.firstName ?? 'Student';
  const pendingHomework = homework.filter((hw) => {
    const submitted = submissions.find((s) => s.homeworkId === hw.id);
    return !submitted;
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayClasses = timetable
    .filter((slot) => slot.day === today)
    .sort((a, b) => a.period - b.period);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${firstName}!`} description="Here is your overview for today" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Homework Due" value={String(pendingHomework.length)} icon={BookOpen} description="Pending submissions" />
        <StatCard title="Today's Classes" value={String(todayClasses.length)} icon={Calendar} description={`${today.charAt(0).toUpperCase() + today.slice(1)} schedule`} />
        <StatCard title="Wallet Balance" value={wallet ? formatCurrency(wallet.balance) : 'R0.00'} icon={Wallet} description="Tuck shop funds" />
        <StatCard title="House Points" value={student?.house ? String(student.house.points) : '0'} icon={Trophy} description={student?.house?.name || 'No house'} />
      </div>

      <AnnouncementBanner limit={3} />

      <FeaturedBanner limit={3} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Upcoming Homework</CardTitle>
            <Link href="/student/homework" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingHomework.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending homework. You are all caught up!</p>
            ) : (
              pendingHomework.slice(0, 3).map((hw) => (
                <Link key={hw.id} href={`/student/homework/${hw.id}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{hw.title}</p>
                    <p className="text-xs text-muted-foreground">{hw.subject?.name ?? hw.subjectName ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Due {formatDate(hw.dueDate)}</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Today&apos;s Classes</CardTitle>
            <Link href="/student/timetable" className="text-sm text-primary hover:underline">Full timetable</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes scheduled today.</p>
            ) : (
              todayClasses.map((slot) => (
                <div key={slot.id ?? `${slot.day}-${slot.period}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      P{slot.period}
                    </div>
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
      </div>
    </div>
  );
}
