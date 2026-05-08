'use client';

import { useState, useEffect } from 'react';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';
import { MarkingBatchReview } from '@/components/ai-tools/MarkingBatchReview';
import { MarkingBatchProgress } from '@/components/ai-tools/MarkingBatchProgress';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import type { MarkingBatch } from '@/types/marking';

interface Props {
  batchId: string;
  onDone: () => void;
}

const EXTRACT_POLL_MS = 2000;

export function BulkBatchFlow({ batchId, onDone }: Props) {
  const { getBatch, cancelBatch } = useTeacherMarkingBatch();
  const [batch, setBatch] = useState<MarkingBatch | null>(null);

  // Poll while status is 'extracting'
  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const poll = async (): Promise<void> => {
      if (cancelled) return;
      const fetched = await getBatch(batchId);
      if (cancelled) return;
      if (fetched) setBatch(fetched);
      if (!fetched || fetched.status === 'extracting') {
        timerId = setTimeout(() => void poll(), EXTRACT_POLL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [batchId, getBatch]);

  const handleCancel = async (): Promise<void> => {
    await cancelBatch(batchId);
    onDone();
  };

  const handleComplete = (completed: MarkingBatch): void => {
    setBatch(completed);
  };

  const showCancel = batch?.status !== 'complete' && batch?.status !== 'failed';

  if (!batch) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Loading batch...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {batch.status === 'extracting' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">
            AI is reading paper headers...
          </p>
        </div>
      )}

      {batch.status === 'reviewing' && (
        <MarkingBatchReview
          batch={batch}
          onConfirmed={() => setBatch((prev) => prev ? { ...prev, status: 'marking' } : prev)}
        />
      )}

      {batch.status === 'marking' && (
        <MarkingBatchProgress batchId={batchId} onComplete={handleComplete} />
      )}

      {batch.status === 'failed' && (
        <p className="text-destructive text-sm">
          Batch failed: {batch.errorMessage ?? 'Unknown error'}
        </p>
      )}

      {batch.status === 'complete' && (
        <p className="text-sm text-muted-foreground">
          Done — switch to History tab to see markings.
        </p>
      )}

      {showCancel && (
        <Button variant="outline" size="sm" onClick={() => void handleCancel()}>
          Cancel
        </Button>
      )}

      {(batch.status === 'complete' || batch.status === 'failed') && (
        <Button variant="outline" size="sm" onClick={onDone}>
          Back
        </Button>
      )}
    </div>
  );
}
