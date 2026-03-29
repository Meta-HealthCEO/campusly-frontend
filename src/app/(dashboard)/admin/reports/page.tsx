'use client';

import { DollarSign, GraduationCap, UserCheck, AlertCircle, ShoppingBag, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const reports: ReportCard[] = [
  {
    title: 'Financial Summary',
    description: 'Overview of revenue, collections, outstanding fees, and payment trends across all fee types and terms.',
    icon: DollarSign,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  },
  {
    title: 'Academic Performance',
    description: 'Student academic results by grade, class, and subject. Includes average scores and pass rates.',
    icon: GraduationCap,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  },
  {
    title: 'Attendance Report',
    description: 'Detailed attendance data by grade, class, and student. Highlights chronic absenteeism.',
    icon: UserCheck,
    color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  },
  {
    title: 'Debtor Analysis',
    description: 'Ageing analysis of outstanding fees with parent contact details and payment history.',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  },
  {
    title: 'Tuckshop Sales',
    description: 'Daily, weekly, and monthly tuckshop sales reports with top-selling items and revenue trends.',
    icon: ShoppingBag,
    color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  },
];

export default function ReportsPage() {
  const handleGenerate = (reportTitle: string) => {
    toast.success(`Generating ${reportTitle}...`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and download school reports</p>
      </div>

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
              <Button className="w-full" variant="outline" onClick={() => handleGenerate(report.title)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
