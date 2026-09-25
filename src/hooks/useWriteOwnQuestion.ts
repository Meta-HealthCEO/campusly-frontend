'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import { ownQuestionPayload, type OwnQuestionInput } from '@/lib/own-question';

interface Scope { subjectId: string; gradeId: string; curriculumNodeId: string }

/**
 * Saves a question the teacher wrote to their question bank for the homework
 * topic (create, then save-to-bank, like kept AI drafts) — no AI involved.
 */
export function useWriteOwnQuestion(): {
  saving: boolean;
  error: string | null;
  save: (q: OwnQuestionInput, scope: Scope) => Promise<string | null>;
  clearError: () => void;
} {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (q: OwnQuestionInput, scope: Scope): Promise<string | null> => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient.post('/question-bank/questions', ownQuestionPayload(q, scope));
      const created = unwrapResponse<{ _id?: string; id?: string }>(res);
      const id = created._id ?? created.id;
      if (!id) throw new Error('The question was not saved.');
      await apiClient.post(`/question-bank/questions/${id}/save-to-bank`);
      return id;
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Your question was not saved. Try again.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  return { saving, error, save, clearError };
}
