'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  BookOpen,
  Calendar,
  Wallet,
  Trophy,
  Clock,
  Star,
} from 'lucide-react';
import {
  mockHomework,
  mockTimetable,
  mockWallets,
  mockHouses,
  mockStudents,
  mockStudentAchievements,
  mockAchievements,
  mockSubmissions,
} from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

// Current student is st1 (Lerato Dlamini)
const currentStudent = mockStudents[0];
const currentWallet = mockWallets.find((w) => w.studentId === currentStudent.id);
const currentHouse = currentStudent.house;

// Homework due today or upcoming
const pendingHomework = mockHomework.filter((hw) => {
  const submitted = mockSubmissions.find(
    (s) => s.homeworkId === hw.id && s.studentId === currentStudent.id
  );
  return !submitted && hw.status === 'published';
});

// Today's timetable (monday as default)
const todayClasses = mockTimetable
  .filter((slot) => slot.day === 'monday')
  .sort((a, b) => a.period - b.period);

// Student achievements
const myAchievements = mockStudentAchievements.filter(
  (sa) => sa.studentId === currentStudent.id
);

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${currentStudent.user.firstName}!`}
        description="Here is your overview for today"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Homework Due"
          value={String(pendingHomework.length)}
          icon={BookOpen}
          description="Pending submissions"
        />
        <StatCard
          title="Today's Classes"
          value={String(todayClasses.length)}
          icon={Calendar}
          description="Monday schedule"
        />
        <StatCard
          title="Wallet Balance"
          value={currentWallet ? formatCurrency(currentWallet.balance) : 'R0.00'}
          icon={Wallet}
          description="Tuck shop funds"
        />
        <StatCard
          title="House Points"
          value={currentHouse ? String(currentHouse.points) : '0'}
          icon={Trophy}
          description={currentHouse?.name || 'No house'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Homework */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Upcoming Homework</CardTitle>
            <Link
              href="/student/homework"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingHomework.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending homework. You are all caught up!
              </p>
            ) : (
              pendingHomework.slice(0, 3).map((hw) => (
                <Link
                  key={hw.id}
                  href={`/student/homework/${hw.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{hw.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {hw.subject.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Due {formatDate(hw.dueDate)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Today&apos;s Classes</CardTitle>
            <Link
              href="/student/timetable"
              className="text-sm text-primary hover:underline"
            >
              Full timetable
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayClasses.map((slot) => (
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
                    <p className="text-xs text-muted-foreground">{slot.room}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {slot.startTime} - {slot.endTime}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Achievements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Recent Achievements</CardTitle>
          <Link
            href="/student/achievements"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {myAchievements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No achievements yet. Keep working hard!
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {myAchievements.map((sa) => (
                <div
                  key={sa.id}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <span className="text-2xl">{sa.achievement.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{sa.achievement.name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-muted-foreground">
                        {sa.achievement.points} pts
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {sa.achievement.category}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
