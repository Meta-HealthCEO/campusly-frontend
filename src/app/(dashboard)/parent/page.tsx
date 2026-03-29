'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import {
  Users, Wallet, GraduationCap, CreditCard, Bell,
  ArrowRight, BookOpen, TrendingUp, Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils';
import { mockStudents, mockWallets, mockInvoices, mockNotifications, mockStudentGrades } from '@/lib/mock-data';
import Link from 'next/link';

const parentChildren = mockStudents.slice(0, 2);

export default function ParentDashboard() {
  const childData = parentChildren.map((child) => {
    const wallet = mockWallets.find((w) => w.studentId === child.id);
    const unpaidInvoice = mockInvoices.find(
      (inv) => inv.studentId === child.id && inv.balanceDue > 0
    );
    const grades = mockStudentGrades.filter((g) => g.studentId === child.id);
    const avgGrade =
      grades.length > 0
        ? Math.round(grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length)
        : 0;

    return { child, wallet, unpaidInvoice, avgGrade };
  });

  const totalBalance = childData.reduce(
    (sum, d) => sum + (d.wallet?.balance ?? 0),
    0
  );
  const totalOutstanding = mockInvoices
    .filter((inv) =>
      parentChildren.some((c) => c.id === inv.studentId) && inv.balanceDue > 0
    )
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  const notifications = mockNotifications.slice(0, 5);

  const notificationTypeStyles: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parent Dashboard"
        description="Welcome back! Here is an overview of your children's school activity."
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Children Enrolled"
          value={String(parentChildren.length)}
          icon={Users}
          description="Active students"
        />
        <StatCard
          title="Total Wallet Balance"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          description="Combined balance"
        />
        <StatCard
          title="Outstanding Fees"
          value={formatCurrency(totalOutstanding)}
          icon={CreditCard}
          description={
            totalOutstanding > 0 ? 'Payment required' : 'All fees paid'
          }
        />
        <StatCard
          title="Notifications"
          value={String(notifications.filter((n) => !n.isRead).length)}
          icon={Bell}
          description="Unread messages"
        />
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">My Children</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {childData.map(({ child, wallet, unpaidInvoice, avgGrade }) => (
            <Card key={child.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {child.user.firstName.charAt(0)}
                      {child.user.lastName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {child.user.firstName} {child.user.lastName}
                      </CardTitle>
                      <CardDescription>
                        {child.grade.name} - {child.class.name}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{child.admissionNumber}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-muted-foreground mr-1" />
                    </div>
                    <p className="text-sm font-medium">
                      {formatCurrency(wallet?.balance ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Wallet</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-muted-foreground mr-1" />
                    </div>
                    <p className="text-sm font-medium">
                      {unpaidInvoice
                        ? formatCurrency(unpaidInvoice.balanceDue)
                        : 'R0.00'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {unpaidInvoice
                        ? `Due ${formatDate(unpaidInvoice.dueDate)}`
                        : 'No fees due'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-muted-foreground mr-1" />
                    </div>
                    <p className="text-sm font-medium">{avgGrade}%</p>
                    <p className="text-xs text-muted-foreground">Grade Avg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions & Notifications */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/parent/fees">
              <Button className="w-full justify-start gap-2" variant="outline">
                <CreditCard className="h-4 w-4" />
                Pay Fees
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/parent/wallet">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Wallet className="h-4 w-4" />
                Load Wallet
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/parent/academics">
              <Button className="w-full justify-start gap-2" variant="outline">
                <GraduationCap className="h-4 w-4" />
                View Grades
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/parent/attendance">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Calendar className="h-4 w-4" />
                Attendance Records
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/parent/library">
              <Button className="w-full justify-start gap-2" variant="outline">
                <BookOpen className="h-4 w-4" />
                Library
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Notifications</CardTitle>
              <Badge variant="secondary">
                {notifications.filter((n) => !n.isRead).length} new
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                    !notification.isRead ? 'bg-muted/50' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      !notification.isRead ? 'bg-primary' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          notificationTypeStyles[notification.type] ?? ''
                        }`}
                      >
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatRelativeDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
