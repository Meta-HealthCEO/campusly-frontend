'use client';

import { useEffect } from 'react';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { MarkingBatch } from '@/types/marking';

interface Props {
  batchId: string;
  onComplete: (batch: MarkingBatch) => void;
}

const POLL_INTERVAL_MS = 3000;

export function MarkingBatchProgress({ batchId, onComplete }: Props) {
  const { getBatch } = useTeacherMarkingBatch();

  useEffect(() => {
    let cancelled = false;

    const poll = async (): Promise<void> => {
      if (cancelled) return;
      const batch = await getBatch(batchId);
      if (cancelled) return;
      if (!batch) {
        setTimeout(() => void poll(), POLL_INTERVAL_MS);
        return;
      }
      if (batch.status === 'complete' || batch.status === 'failed') {
        onComplete(batch);
        return;
      }
      setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [batchId, getBatch, onComplete]);

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">
        AI is marking student papers... this may take a few minutes.
      </p>
    </div>
  );
}
