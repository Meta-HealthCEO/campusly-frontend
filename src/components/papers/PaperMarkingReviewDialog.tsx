'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MarkingResults } from '@/components/ai-tools/MarkingResults';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';
import type { PaperMarking, MarkingQuestion } from '@/hooks/useTeacherMarking';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markingId: string | null;
  onChanged: () => void;
}

export function PaperMarkingReviewDialog({
  open, onOpenChange, markingId, onChanged,
}: Props) {
  const {
    loading, getMarking, updateMarking, publishMarking,
  } = useTeacherMarking();
  const [marking, setMarking] = useState<PaperMarking | null>(null);
  const activeMarking = open && marking?.id === markingId ? marking : null;

  useEffect(() => {
    if (!open || !markingId) return;
    let cancelled = false;
    void getMarking(markingId).then((m) => {
      if (!cancelled) setMarking(m);
    });
    return () => { cancelled = true; };
  }, [open, markingId, getMarking]);

  const handleUpdate = async (questions: MarkingQuestion[]) => {
    if (!activeMarking) return;
    await updateMarking(activeMarking.id, questions);
    const refreshed = await getMarking(activeMarking.id);
    setMarking(refreshed);
    onChanged();
  };

  const handlePublish = async (assessmentId: string, comment?: string) => {
    if (!activeMarking) return;
    const updated = await publishMarking(
      activeMarking.id,
      assessmentId,
      activeMarking.studentId,
      comment,
    );
    if (updated) {
      setMarking(updated);
      onChanged();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {marking ? `Review marking — ${marking.studentName}` : 'Review marking'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          {!activeMarking ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <MarkingResults
              marking={activeMarking}
              onUpdateMarks={handleUpdate}
              onPublish={handlePublish}
              onMarkNext={() => onOpenChange(false)}
              onViewAll={() => onOpenChange(false)}
              isLoading={loading}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
