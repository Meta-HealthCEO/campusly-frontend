'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResolutionCard } from '@/components/sgb';
import { useSgbResolutions, useSgbResolutionMutations } from '@/hooks/useSgbResolutions';
import { useAuthStore } from '@/stores/useAuthStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { SgbVoteChoice } from '@/types';

export default function SgbResolutionsPage() {
  const { user } = useAuthStore();
  const userId = user?.id ?? '';
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [voting, setVoting] = useState(false);

  const { resolutions, loading, refetch } = useSgbResolutions({ status, category });
  const { castVote } = useSgbResolutionMutations();

  const handleVote = useCallback(async (resolutionId: string, vote: SgbVoteChoice) => {
    setVoting(true);
    try {
      await castVote(resolutionId, vote);
      toast.success('Vote recorded');
      refetch();
    } catch (err: unknown) {
      console.error('Vote failed', err);
      toast.error('Failed to record vote');
    } finally {
      setVoting(false);
    }
  }, [castVote, refetch]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Resolutions" description="SGB resolutions and voting">
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(val: unknown) => setStatus(val as string)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="proposed">Proposed</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={(val: unknown) => setCategory(val as string)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="policy">Policy</SelectItem>
              <SelectItem value="staffing">Staffing</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="curriculum">Curriculum</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {resolutions.length === 0 ? (
        <EmptyState icon={FileText} title="No resolutions" description="No resolutions match the current filters." />
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {resolutions.map((res) => (
            <ResolutionCard
              key={res.id}
              resolution={res}
              userId={userId}
              onVote={handleVote}
              voting={voting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
