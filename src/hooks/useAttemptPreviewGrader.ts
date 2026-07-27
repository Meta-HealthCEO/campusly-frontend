'use client';

import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface PreviewGradeResult {
  correct: boolean;
  score: number;
  maxScore: number;
  feedback?: string;
}

interface UseAttemptPreviewGraderResult {
  /**
   * Grade a block response via the AI preview grader without recording a
   * student attempt. Returns null when grading is unavailable so callers
   * can render a neutral "answer recorded" state.
   */
  gradePreviewAttempt: (
    blockContent: string,
    blockType: string,
    response: string,
  ) => Promise<PreviewGradeResult | null>;
}

export function useAttemptPreviewGrader(): UseAttemptPreviewGraderResult {
  const gradePreviewAttempt = useCallback(
    async (
      blockContent: string,
      blockType: string,
      response: string,
    ): Promise<PreviewGradeResult | null> => {
      try {
        const res = await apiClient.post('/content-library/grade-attempt', {
          blockContent,
          blockType,
          response,
        });
        return unwrapResponse<PreviewGradeResult>(res);
      } catch {
        return null;
      }
    },
    [],
  );

  return { gradePreviewAttempt };
}
