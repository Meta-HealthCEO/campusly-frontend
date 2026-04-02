'use client';

import { useState, useEffect } from 'react';
import {
  Compass,
  Target,
  GraduationCap,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useAPS } from '@/hooks/useAPS';
import { useProgrammeMatcher } from '@/hooks/useProgrammeMatcher';
import { useApplications } from '@/hooks/useApplications';
import { useBursaries } from '@/hooks/useBursaries';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { APSScoreCard } from '@/components/careers/APSScoreCard';
import DeadlineTimeline from '@/components/careers/DeadlineTimeline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ParentCareersPage() {
  const { children, loading: parentLoading } = useCurrentParent();
  const [selectedChildId, setSelectedChildId] = useState('');

  // Default to first child once loaded
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { aps, loading: apsLoading } = useAPS(selectedChildId);
  const { matchResult, loading: matchLoading } = useProgrammeMatcher(selectedChildId);
  const { applications, deadlines, loading: appsLoading } = useApplications(selectedChildId);
  const { fetchMatched, matchedBursaries } = useBursaries();

  // Fetch matched bursaries when child changes
  useEffect(() => {
    if (selectedChildId) {
      fetchMatched(selectedChildId);
    }
  }, [selectedChildId, fetchMatched]);

  if (parentLoading) {
    return <LoadingSpinner />;
  }

  if (children.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No children found"
        description="We could not find any linked student records. Please contact your school administrator."
      />
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const dataLoading = apsLoading || matchLoading || appsLoading;

  const childSelector = children.length > 1 ? (
    <Select value={selectedChildId} onValueChange={(val: unknown) => setSelectedChildId(val as string)}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="Select a child" />
      </SelectTrigger>
      <SelectContent>
        {children.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.firstName} {child.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <p className="text-sm text-muted-foreground">
      {selectedChild?.firstName} {selectedChild?.lastName}
    </p>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Guidance"
        description="View your child's career exploration progress and upcoming deadlines"
      >
        {childSelector}
      </PageHeader>

      {dataLoading ? (
        <LoadingSpinner />
      ) : (
        <>
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
            />
            <StatCard
              title="Applications"
              value={String(applications.length)}
              icon={FileText}
            />
            <StatCard
              title="Matched Bursaries"
              value={String(matchedBursaries.length)}
              icon={DollarSign}
            />
          </div>

          {/* APS Score Card */}
          {aps ? (
            <APSScoreCard aps={aps} />
          ) : (
            <EmptyState
              icon={Target}
              title="No APS data available"
              description="Your child's APS score will appear here once their marks have been captured."
            />
          )}

          {/* Deadlines */}
          {deadlines.length > 0 && <DeadlineTimeline deadlines={deadlines} />}

          {/* Empty state when no career data at all */}
          {!aps && deadlines.length === 0 && applications.length === 0 && (
            <EmptyState
              icon={Compass}
              title="No career data yet"
              description="Career guidance information will appear here as your child begins exploring programmes and opportunities."
            />
          )}
        </>
      )}
    </div>
  );
}
