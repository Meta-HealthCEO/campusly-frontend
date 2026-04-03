'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Upload, MessageSquarePlus } from 'lucide-react';
import { useGovernanceSIP } from '@/hooks/useGovernanceSIP';
import {
  SIPGoalDetailView, EvidenceUploadDialog, ReviewDialog,
} from '@/components/governance';
import type { SIPGoal, SIPEvidence, SIPReview, CreateSIPReviewPayload } from '@/types';

export default function GoalDetailPage() {
  const params = useParams();
  const goalId = params.goalId as string;
  const { goals, fetchGoals, addEvidence, addReview } = useGovernanceSIP();
  const [goal, setGoal] = useState<SIPGoal | null>(null);
  const [evidence, setEvidence] = useState<SIPEvidence[]>([]);
  const [reviews, setReviews] = useState<SIPReview[]>([]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The goal should be in the goals array if we navigated from the goals tab
    const found = goals.find((g) => g.id === goalId);
    if (found) {
      setGoal(found);
      setLoading(false);
    }
  }, [goals, goalId]);

  const handleAddEvidence = useCallback(async (data: { title: string; fileUrl: string; fileType?: string }) => {
    await addEvidence(goalId, data);
    setEvidenceOpen(false);
  }, [goalId, addEvidence]);

  const handleAddReview = useCallback(async (data: CreateSIPReviewPayload) => {
    await addReview(goalId, data);
    setReviewOpen(false);
  }, [goalId, addReview]);

  if (loading || !goal) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title={goal.title} description={`Goal Detail — ${goal.status.replace('_', ' ')}`}>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEvidenceOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Add Evidence
          </Button>
          <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" /> Add Review
          </Button>
        </div>
      </PageHeader>

      <SIPGoalDetailView
        goal={goal}
        evidence={evidence}
        reviews={reviews}
        onAddEvidence={() => setEvidenceOpen(true)}
        onAddReview={() => setReviewOpen(true)}
      />

      <EvidenceUploadDialog
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        onSubmit={handleAddEvidence}
      />
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onSubmit={handleAddReview}
      />
    </div>
  );
}
