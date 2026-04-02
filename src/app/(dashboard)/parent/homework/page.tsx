'use client';

import { useState, useEffect, useMemo } from 'react';
import { BookOpen, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ParentHomeworkList } from '@/components/homework/ParentHomeworkList';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentHomework, getHomeworkDisplayStatus } from '@/hooks/useParentHomework';

export default function ParentHomeworkPage() {
  const { children, loading: parentLoading } = useCurrentParent();
  const { homework, loading: hwLoading, loadHomework } = useParentHomework();
  const [selectedChildId, setSelectedChildId] = useState('');

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  // Load homework when child selection changes
  useEffect(() => {
    if (selectedChildId) {
      loadHomework(selectedChildId);
    }
  }, [selectedChildId, loadHomework]);

  const stats = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let totalMark = 0;
    let gradedCount = 0;

    for (const hw of homework) {
      const status = getHomeworkDisplayStatus(hw);
      if (status === 'pending') pending++;
      if (status === 'overdue') overdue++;
      if (status === 'graded' && hw.submission?.mark !== undefined) {
        totalMark += (hw.submission.mark / hw.totalMarks) * 100;
        gradedCount++;
      }
    }

    const avgMark = gradedCount > 0 ? Math.round(totalMark / gradedCount) : 0;
    return { pending, overdue, avgMark, gradedCount };
  }, [homework]);

  if (parentLoading) return <LoadingSpinner />;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Homework" description="View your child's homework and submissions" />
        <EmptyState icon={BookOpen} title="No children found" description="No children are linked to your account." />
      </div>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="View your child's homework and submissions">
        {children.length > 1 ? (
          <Select value={selectedChildId} onValueChange={(val: unknown) => setSelectedChildId(val as string)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select child" />
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
          <span className="text-sm text-muted-foreground">
            {selectedChild?.firstName} {selectedChild?.lastName}
          </span>
        )}
      </PageHeader>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending" value={stats.pending.toString()} icon={Clock} description="Awaiting submission" />
        <StatCard title="Overdue" value={stats.overdue.toString()} icon={AlertTriangle} description="Past due date" />
        <StatCard title="Average Mark" value={stats.gradedCount > 0 ? `${stats.avgMark}%` : '—'} icon={CheckCircle} description={`${stats.gradedCount} graded`} />
        <StatCard title="Total" value={homework.length.toString()} icon={BookOpen} description="All assignments" />
      </div>

      {hwLoading ? <LoadingSpinner /> : <ParentHomeworkList homework={homework} />}
    </div>
  );
}
