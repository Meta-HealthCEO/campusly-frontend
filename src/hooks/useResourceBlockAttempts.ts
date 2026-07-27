'use client';

import { useCallback, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { gradeBlockLocally } from '@/lib/block-grading';
import {
  createDefaultInteraction,
  applyAttemptToInteraction,
} from '@/lib/block-interactions';
import { useMyStudentId } from '@/hooks/useMyStudentId';
import type { ContentBlockItem } from '@/types';
import type { AttemptResult, BlockInteractionState } from '@/types/student-learning';

const MAX_TIME_SPENT_SECONDS = 2 * 60 * 60;

interface UseResourceBlockAttemptsResult {
  /** Interaction state per blockId — feed into BlockRenderer. */
  getInteraction: (blockId: string) => BlockInteractionState;
  /**
   * Submit a response for a block. Persists to the mastery API when the
   * resource + student are known; falls back to local grading (same rules
   * as the server) so the student always gets instant feedback.
   */
  submitBlockAttempt: (block: ContentBlockItem, response: string) => Promise<AttemptResult>;
}

export function useResourceBlockAttempts(
  resourceId: string | undefined,
): UseResourceBlockAttemptsResult {
  const { studentId } = useMyStudentId();
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(
    () => new Map(),
  );
  const openedAtRef = useRef<number>(Date.now());
  const localAttemptCountsRef = useRef<Map<string, number>>(new Map());

  const getInteraction = useCallback(
    (blockId: string): BlockInteractionState =>
      interactions.get(blockId) ?? createDefaultInteraction(blockId),
    [interactions],
  );

  const recordInteraction = useCallback(
    (blockId: string, result: AttemptResult, correctOverride?: boolean | null) => {
      setInteractions((prev) => {
        const next = new Map(prev);
        const current = prev.get(blockId) ?? createDefaultInteraction(blockId);
        next.set(blockId, applyAttemptToInteraction(current, result, correctOverride));
        return next;
      });
    },
    [],
  );

  const submitBlockAttempt = useCallback(
    async (block: ContentBlockItem, response: string): Promise<AttemptResult> => {
      const timeSpentSeconds = Math.min(
        MAX_TIME_SPENT_SECONDS,
        Math.max(0, Math.round((Date.now() - openedAtRef.current) / 1000)),
      );

      if (resourceId && studentId) {
        try {
          const res = await apiClient.post(
            `/content-library/student/resources/${resourceId}/attempt`,
            {
              blockId: block.blockId,
              ...(block.curriculumNodeId ? { curriculumNodeId: block.curriculumNodeId } : {}),
              response,
              timeSpentSeconds,
              hintsUsed: 0,
            },
            { params: { studentId } },
          );
          const result = unwrapResponse<AttemptResult>(res);
          recordInteraction(block.blockId, result);
          return result;
        } catch {
          // Server rejected (unapproved resource, no curriculum alignment,
          // offline…) — grade locally so the student still gets feedback.
        }
      }

      const local = gradeBlockLocally(block.type, block.content, response, block.points);
      const attemptNumber = (localAttemptCountsRef.current.get(block.blockId) ?? 0) + 1;
      localAttemptCountsRef.current.set(block.blockId, attemptNumber);
      const result: AttemptResult = {
        id: `local-${block.blockId}-${attemptNumber}`,
        correct: local.correct === true,
        score: local.score,
        maxScore: local.maxScore,
        attemptNumber,
      };
      recordInteraction(block.blockId, result, local.correct);
      return result;
    },
    [resourceId, studentId, recordInteraction],
  );

  return { getInteraction, submitBlockAttempt };
}
