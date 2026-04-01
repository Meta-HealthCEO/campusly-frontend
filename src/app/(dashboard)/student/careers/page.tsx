'use client';

import Link from 'next/link';
import {
  Compass,
  GraduationCap,
  FileText,
  Target,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useAPS } from '@/hooks/useAPS';
import { useProgrammeMatcher } from '@/hooks/useProgrammeMatcher';
import { useApplications } from '@/hooks/useApplications';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { APSScoreCard } from '@/components/careers/APSScoreCard';
import { APSSimulator } from '@/components/careers/APSSimulator';
import DeadlineTimeline from '@/components/careers/DeadlineTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const quickLinks = [
  { label: 'Programmes', href: '/student/careers/explore', icon: GraduationCap },
  { label: 'Aptitude Test', href: '/student/careers/aptitude', icon: Target },
  { label: 'Bursaries', href: '/student/careers/bursaries', icon: DollarSign },
  { label: 'Careers', href: '/student/careers/careers', icon: Compass },
  { label: 'Portfolio', href: '/student/portfolio', icon: BookOpen },
] as const;

export default function StudentCareersPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const studentId = student?.id ?? '';
  const { aps, loading: apsLoading, simulate } = useAPS(studentId);
  const { matchResult, loading: matchLoading } = useProgrammeMatcher(studentId);
  const { deadlines, loading: deadlinesLoading } = useApplications(studentId);

  if (studentLoading || apsLoading || matchLoading || deadlinesLoading) {
    return <LoadingSpinner />;
  }

  if (!student) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Student profile not found"
        description="We could not locate your student record. Please contact your school administrator."
      />
    );
  }

  const uniqueUnis = matchResult
    ? new Set(
        matchResult.matches
          .filter((m) => m.status === 'eligible')
          .map((m) => m.universityName),
      ).size
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Guidance"
        description="Plan your future — explore programmes, track applications, and discover opportunities"
      />

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="APS Score"
          value={aps ? `${aps.totalAPS}/${aps.maxAPS}` : '—'}
          icon={Target}
        />
        <StatCard
          title="Eligible Programmes"
          value={matchResult ? String(matchResult.summary.eligible) : '—'}
          icon={GraduationCap}
          description={matchResult ? `${uniqueUnis} unique universit${uniqueUnis === 1 ? 'y' : 'ies'}` : undefined}
        />
        <StatCard
          title="Close Matches"
          value={matchResult ? String(matchResult.summary.close) : '—'}
          icon={Compass}
        />
        <StatCard
          title="Applications"
          value="—"
          icon={FileText}
        />
      </div>

      {/* APS + Simulator row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {aps ? (
          <>
            <APSScoreCard aps={aps} />
            <APSSimulator aps={aps} onSimulate={simulate} />
          </>
        ) : (
          <div className="lg:col-span-2">
            <EmptyState
              icon={Target}
              title="No APS data available"
              description="Your APS score will appear here once your marks have been captured."
            />
          </div>
        )}
      </div>

      {/* Deadlines section */}
      {deadlines.length > 0 && <DeadlineTimeline deadlines={deadlines} />}

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Explore</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2"
                >
                  <link.icon className="h-5 w-5" />
                  <span className="text-xs">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
