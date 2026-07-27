// ============================================================
// Block interaction state — shared by every BlockRenderer host
// ============================================================

import type { AttemptResult, BlockInteractionState } from '@/types/student-learning';

/** Fresh, unanswered interaction state for a block. */
export function createDefaultInteraction(blockId: string): BlockInteractionState {
  return {
    blockId,
    answered: false,
    correct: null,
    score: 0,
    maxScore: 0,
    showExplanation: false,
    hintsRevealed: 0,
    attemptResult: null,
  };
}

/**
 * Fold an attempt result into the interaction state (immutably).
 * Pass `correctOverride: null` for responses that were recorded but not
 * auto-graded — the UI then shows "answer recorded" instead of a verdict.
 */
export function applyAttemptToInteraction(
  prev: BlockInteractionState,
  result: AttemptResult,
  correctOverride?: boolean | null,
): BlockInteractionState {
  return {
    ...prev,
    answered: true,
    correct: correctOverride === undefined ? result.correct : correctOverride,
    score: result.score,
    maxScore: result.maxScore,
    showExplanation: true,
    attemptResult: result,
  };
}
