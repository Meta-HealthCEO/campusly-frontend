'use client';

import Link from 'next/link';
import { ClipboardList, FileText, Sparkles, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { NextUp } from '@/components/readiness/NextUp';
import { Card, CardContent } from '@/components/ui/card';
import type { TodayItem, TodayNextUp } from '@/lib/standalone-today';

interface StandaloneTodayProps {
  greeting: string;
  dateLabel: string;
  nextUp: TodayNextUp | null;
  homework: TodayItem | null;
  test: TodayItem | null;
  /** "12 tutor messages left this month", or null while unknown. */
  tutorLine: string | null;
}

function Row({ icon: Icon, label, item, empty }: { icon: LucideIcon; label: string; item: TodayItem | null; empty: string }) {
  const body = (
    <>
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{item ? item.title : empty}</p>
        {item ? <p className="text-sm text-muted-foreground">{item.detail}</p> : null}
      </div>
    </>
  );
  return item ? (
    <Link href={item.href} className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</Link>
  ) : (
    <div className="flex min-h-11 items-center gap-3 px-4 py-3">{body}</div>
  );
}

/** Today for a standalone teacher's learner: one next step, what's due, and tutor messages left (spec §2). */
export function StandaloneToday({ greeting, dateLabel, nextUp, homework, test, tutorLine }: StandaloneTodayProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={greeting} description={dateLabel} />
      {nextUp ? (
        <NextUp eyebrow={nextUp.eyebrow} title={nextUp.title} detail={nextUp.detail} actionLabel={nextUp.actionLabel} href={nextUp.href} />
      ) : (
        <EmptyState title="Nothing to do right now" description="When your teacher releases a lesson or sets homework, it appears here." />
      )}
      <Card>
        <CardContent className="divide-y divide-border p-0">
          <Row icon={ClipboardList} label="Next homework" item={homework} empty="All caught up" />
          <Row icon={FileText} label="Next test" item={test} empty="No tests set" />
          {tutorLine ? (
            <Row icon={Sparkles} label="AI tutor" item={{ title: tutorLine, detail: 'Ask for a hint or an explanation', href: '/student/ai-tutor' }} empty="" />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
