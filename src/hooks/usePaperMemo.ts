import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { PaperMemo } from '@/types';

interface UsePaperMemoReturn {
  memo: PaperMemo | null;
  loading: boolean;
  generating: boolean;
  saving: boolean;
  fetchMemo: (paperId: string) => Promise<void>;
  generateMemo: (paperId: string) => Promise<PaperMemo | null>;
  updateMemo: (id: string, data: Partial<PaperMemo>) => Promise<PaperMemo | null>;
}

export function usePaperMemo(): UsePaperMemoReturn {
  const [memo, setMemo] = useState<PaperMemo | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMemo = useCallback(async (paperId: string) => {
    if (!paperId) return;
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/teacher-workbench/memos/paper/${paperId}`,
      );
      const data = unwrapResponse<PaperMemo>(response);
      setMemo(data);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load memo');
      console.error(msg, err);
      setMemo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateMemo = useCallback(async (paperId: string): Promise<PaperMemo | null> => {
    setGenerating(true);
    try {
      const response = await apiClient.post(
        `/teacher-workbench/memos/generate/${paperId}`,
      );
      const data = unwrapResponse<PaperMemo>(response);
      setMemo(data);
      toast.success('Memo generated successfully');
      return data;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to generate memo');
      toast.error(msg);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const updateMemo = useCallback(
    async (id: string, data: Partial<PaperMemo>): Promise<PaperMemo | null> => {
      setSaving(true);
      try {
        const response = await apiClient.put(
          `/teacher-workbench/memos/${id}`,
          data,
        );
        const updated = unwrapResponse<PaperMemo>(response);
        setMemo(updated);
        toast.success('Memo saved successfully');
        return updated;
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to save memo');
        toast.error(msg);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { memo, loading, generating, saving, fetchMemo, generateMemo, updateMemo };
}
