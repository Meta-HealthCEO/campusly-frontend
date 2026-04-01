'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModerationCard } from '@/components/workbench/papers/ModerationCard';
import { ModerationReviewForm } from '@/components/workbench/papers/ModerationReviewForm';
import { usePaperModeration } from '@/hooks/usePaperModeration';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PaperModeration, ModerationStatus } from '@/types';

export default function ModerationPage() {
  const {
    moderations,
    loading,
    submitting,
    fetchQueue,
    reviewPaper,
  } = usePaperModeration();

  const user = useAuthStore((s) => s.user);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Split: papers submitted by the current teacher vs. queue for HOD/admin
  const myPapers = moderations.filter((m) => m.submittedBy === user?.id);
  const reviewQueue = moderations.filter(
    (m) => m.status === 'pending' && m.submittedBy !== user?.id,
  );

  function handleCardClick(moderation: PaperModeration, isReviewQueue: boolean) {
    if (isReviewQueue) {
      setSelectedPaperId(moderation.paperId);
      setReviewOpen(true);
    }
  }

  async function handleReviewSubmit(
    status: Extract<ModerationStatus, 'approved' | 'changes_requested'>,
    comments: string,
  ) {
    if (!selectedPaperId) return;
    await reviewPaper(selectedPaperId, status, comments);
    setSelectedPaperId(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paper Moderation"
        description="Track submission status and review papers in the moderation queue"
      />

      <Tabs defaultValue="my-papers">
        <TabsList className="w-full sm:w-auto flex-wrap">
          <TabsTrigger value="my-papers">My Papers</TabsTrigger>
          <TabsTrigger value="review-queue">
            Review Queue
            {reviewQueue.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5 leading-none">
                {reviewQueue.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-papers" className="mt-4">
          {myPapers.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No papers submitted"
              description="Papers you submit for moderation will appear here."
            />
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {myPapers.map((m) => (
                <ModerationCard
                  key={m.id}
                  moderation={m}
                  onClick={() => handleCardClick(m, false)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review-queue" className="mt-4">
          {reviewQueue.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No papers pending review"
              description="Papers waiting for your moderation will appear here."
            />
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {reviewQueue.map((m) => (
                <ModerationCard
                  key={m.id}
                  moderation={m}
                  onClick={() => handleCardClick(m, true)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ModerationReviewForm
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onSubmit={handleReviewSubmit}
        submitting={submitting}
      />
    </div>
  );
}
