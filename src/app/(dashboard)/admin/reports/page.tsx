'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, GraduationCap, UserCheck, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  href: string;
}

const reports: ReportCard[] = [
  {
    title: 'Revenue Report',
    description: 'Monthly revenue trends with date range filters. Track payment collections over time.',
    icon: DollarSign,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    href: '/admin/reports/revenue',
  },
  {
    title: 'Academic Performance',
    description: 'Subject averages and pass rates by term and academic year across the school.',
    icon: GraduationCap,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
    href: '/admin/reports/academic-performance',
  },
  {
    title: 'Attendance Report',
    description: 'Attendance status breakdown by date range and class with visual charts.',
    icon: UserCheck,
    color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
    href: '/admin/reports/attendance',
  },
  {
    title: 'Debtor Analysis',
    description: 'Outstanding invoice ageing analysis with bucket classification and student details.',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    href: '/admin/reports/debtors',
  },
  {
    title: 'Tuck Shop Sales',
    description: 'Daily, weekly, and monthly tuck shop sales with revenue trends and order counts.',
    icon: ShoppingBag,
    color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
    href: '/admin/reports/tuck-shop-sales',
  },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate and view school reports" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.title} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${report.color}`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{report.title}</CardTitle>
              </div>
              <CardDescription className="mt-2">{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push(report.href)}
              >
                View Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
