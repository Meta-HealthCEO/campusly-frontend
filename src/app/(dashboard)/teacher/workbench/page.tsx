'use client';

import Link from 'next/link';
import {
  BookOpen,
  Database,
  CheckCircle,
  ClipboardCheck,
  FileText,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useWorkbenchDashboard } from '@/hooks/useWorkbenchDashboard';

const QUICK_ACTIONS = [
  {
    title: 'Build Paper',
    description: 'Create and compile assessment papers from your question bank.',
    href: '/teacher/workbench/papers/builder',
    icon: FileText,
  },
  {
    title: 'Question Bank',
    description: 'Browse, add, and manage your reusable question library.',
    href: '/teacher/workbench/question-bank',
    icon: Database,
  },
  {
    title: 'View Planner',
    description: 'Plan assessments across the term and spot date clashes.',
    href: '/teacher/workbench/planner',
    icon: CalendarDays,
  },
  {
    title: 'Check Coverage',
    description: 'Track curriculum topic coverage across your classes.',
    href: '/teacher/workbench/curriculum',
    icon: BookOpen,
  },
];

export default function WorkbenchPage() {
  const { data, loading } = useWorkbenchDashboard();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Workbench"
        description="Your teaching automation hub"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Coverage"
          value={`${data?.coveragePercentage ?? 0}%`}
          icon={BookOpen}
          description="Curriculum covered this term"
        />
        <StatCard
          title="Questions"
          value={String(data?.questionCount ?? 0)}
          icon={Database}
          description="In your question bank"
        />
        <StatCard
          title="Moderation"
          value={String(data?.pendingModeration ?? 0)}
          icon={CheckCircle}
          description="Papers awaiting moderation"
        />
        <StatCard
          title="Marking Due"
          value={String(data?.markingItemsDue ?? 0)}
          icon={ClipboardCheck}
          description="Items needing marking"
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {action.title}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        {!data || data.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.detail}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(activity.timestamp).toLocaleString()}
                  </time>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
