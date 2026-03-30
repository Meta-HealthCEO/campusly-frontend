'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import {
  FileText, CheckCircle, Sparkles, Clock, ArrowRight,
  BookOpen, PenTool,
} from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

const recentActivity = [
  { id: '1', action: 'Generated paper', detail: 'Grade 10 Science — Chemical Reactions', time: '2 hours ago', type: 'create' as const },
  { id: '2', action: 'AI graded submissions', detail: 'Grade 9 English — Essay Writing (8 submissions)', time: '5 hours ago', type: 'grade' as const },
  { id: '3', action: 'Generated paper', detail: 'Grade 11 Mathematics — Quadratic Equations', time: '1 day ago', type: 'create' as const },
  { id: '4', action: 'AI graded submissions', detail: 'Grade 10 Science — Lab Report (12 submissions)', time: '2 days ago', type: 'grade' as const },
  { id: '5', action: 'Generated paper', detail: 'Grade 8 Geography — Climate Zones', time: '3 days ago', type: 'create' as const },
];

export default function AIToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Tools"
        description="Create papers and grade submissions with AI assistance"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Papers Generated" value="12" icon={FileText} description="This month" trend={{ value: 20, label: 'vs last month' }} />
        <StatCard title="Submissions Graded" value="47" icon={CheckCircle} description="This month" trend={{ value: 35, label: 'vs last month' }} />
        <StatCard title="Avg. Grading Time" value="8s" icon={Clock} description="Per submission" />
        <StatCard title="Time Saved" value="6.2 hrs" icon={Sparkles} description="This month" />
      </div>

      {/* Main Action Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Link href={ROUTES.TEACHER_AI_CREATE_PAPER}>
          <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-2xl bg-primary/10 p-5 transition-colors group-hover:bg-primary/15">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Create Paper</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate exam papers, tests, and worksheets with AI
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  Get started <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={ROUTES.TEACHER_AI_GRADING}>
          <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-2xl bg-emerald-500/10 p-5 transition-colors group-hover:bg-emerald-500/15">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Grade Papers</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Let AI grade student submissions and provide feedback
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  Start grading <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={ROUTES.TEACHER_AI_PAPERS}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">Paper Library</h3>
                <p className="text-sm text-muted-foreground">View and manage your generated papers</p>
              </div>
              <Badge variant="secondary">5 papers</Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href={ROUTES.TEACHER_AI_GRADING}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                <PenTool className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">Pending Reviews</h3>
                <p className="text-sm text-muted-foreground">AI-graded submissions awaiting your review</p>
              </div>
              <Badge variant="secondary">3 pending</Badge>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        <div className="space-y-2">
          {recentActivity.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  item.type === 'create' ? 'bg-primary/10' : 'bg-emerald-500/10'
                }`}>
                  {item.type === 'create' ? (
                    <FileText className="h-4 w-4 text-primary" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="truncate text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
