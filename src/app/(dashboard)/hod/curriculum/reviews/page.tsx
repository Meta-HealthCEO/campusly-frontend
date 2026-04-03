'use client';

import { useEffect, useState, useCallback } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResourceCard } from '@/components/content/ResourceCard';
import { ReviewDialog } from '@/components/content/ReviewDialog';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import type { ContentResourceItem, ReviewPayload } from '@/types';

// ─── Page ──────────────────────────────────────────────────────────────────

export default function HODReviewQueuePage() {
  const { resources, loading, fetchResources, getResource, reviewResource } =
    useContentLibrary();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedResource, setSelectedResource] =
    useState<ContentResourceItem | null>(null);

  const loadPending = useCallback(() => {
    fetchResources({ status: 'pending_review' });
  }, [fetchResources]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleCardClick = async (resource: ContentResourceItem) => {
    const full = await getResource(resource.id);
    if (full) {
      setSelectedResource(full);
      setReviewOpen(true);
    }
  };

  const handleReview = async (id: string, payload: ReviewPayload) => {
    const success = await reviewResource(id, payload);
    if (success) {
      setReviewOpen(false);
      setSelectedResource(null);
      loadPending();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Queue"
        description="Approve or reject resources submitted by teachers"
      />

      {loading ? (
        <LoadingSpinner />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No pending reviews"
          description="All submitted resources have been reviewed. Check back later."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        resource={selectedResource}
        onSubmit={handleReview}
      />
    </div>
  );
}
