'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { MarkingBatch, ConfirmBatchAssignment } from '@/types/marking';

export function useTeacherMarkingBatch(): {
  createBatch: (
    paperId: string,
    paperType: 'generated' | 'assessment',
    classId: string,
    files: File[],
  ) => Promise<MarkingBatch | null>;
  getBatch: (id: string) => Promise<MarkingBatch | null>;
  confirmBatch: (
    id: string,
    assignments: ConfirmBatchAssignment[],
  ) => Promise<{ spawned: number; failed: number } | null>;
  cancelBatch: (id: string) => Promise<boolean>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);

  const createBatch = useCallback(
    async (
      paperId: string,
      paperType: 'generated' | 'assessment',
      classId: string,
      files: File[],
    ): Promise<MarkingBatch | null> => {
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('paperId', paperId);
        fd.append('paperType', paperType);
        fd.append('classId', classId);
        files.forEach((f) => fd.append('files', f));
        const res = await apiClient.post('/ai-tools/mark-batch', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrapResponse<MarkingBatch>(res);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Batch upload failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getBatch = useCallback(async (id: string): Promise<MarkingBatch | null> => {
    try {
      const res = await apiClient.get(`/ai-tools/batches/${id}`);
      return unwrapResponse<MarkingBatch>(res);
    } catch {
      return null;
    }
  }, []);

  const confirmBatch = useCallback(
    async (
      id: string,
      assignments: ConfirmBatchAssignment[],
    ): Promise<{ spawned: number; failed: number } | null> => {
      try {
        const res = await apiClient.post(`/ai-tools/batches/${id}/confirm`, { assignments });
        return unwrapResponse<{ spawned: number; failed: number }>(res);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Confirm failed');
        return null;
      }
    },
    [],
  );

  const cancelBatch = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/ai-tools/batches/${id}`);
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
      return false;
    }
  }, []);

  return { createBatch, getBatch, confirmBatch, cancelBatch, loading };
}
