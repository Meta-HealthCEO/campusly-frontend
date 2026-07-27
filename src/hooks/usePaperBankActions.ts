'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';

interface UsePaperBankActionsResult {
  busy: boolean;
  /**
   * Commit a paper question into the teacher's question bank. Works for
   * inline questions (creates an approved Question doc) and bank-ref
   * drafts (flips status to approved). Throws on failure.
   */
  saveQuestionToBank: (
    paperId: string,
    sectionIdx: number,
    position: number,
  ) => Promise<void>;
}

export function usePaperBankActions(): UsePaperBankActionsResult {
  const [busy, setBusy] = useState(false);

  const saveQuestionToBank = useCallback(
    async (paperId: string, sectionIdx: number, position: number): Promise<void> => {
      setBusy(true);
      try {
        await apiClient.post(
          `/question-bank/papers/${paperId}/sections/${sectionIdx}/questions/${position}/save-to-bank`,
        );
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { busy, saveQuestionToBank };
}
