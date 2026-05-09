'use client';
import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';

export function useComprehensionGenerator(): {
  generate: (
    contentResourceId: string,
    subjectId: string,
    gradeId: string,
    curriculumNodeId?: string,
    count?: number,
  ) => Promise<string[] | null>;
  generating: boolean;
} {
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async (
    contentResourceId: string,
    subjectId: string,
    gradeId: string,
    curriculumNodeId?: string,
    count = 4,
  ): Promise<string[] | null> => {
    setGenerating(true);
    try {
      const params: Record<string, string> = { subjectId, gradeId };
      if (curriculumNodeId) params.curriculumNodeId = curriculumNodeId;
      const res = await apiClient.post(
        '/homework/comprehension-questions',
        { contentResourceId, count },
        { params },
      );
      const data = unwrapResponse<{ questionIds: string[] }>(res);
      return data.questionIds;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  return { generate, generating };
}
