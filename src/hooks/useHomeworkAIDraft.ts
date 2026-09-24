'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapList } from '@/lib/api-helpers';
import { toDraftQuestion, type DraftQuestion, type draftRequest } from '@/lib/homework-ai-draft';

type DraftBody = ReturnType<typeof draftRequest>;

/** Draft exercise questions with the question bank's AI, then keep (approve) the ones the teacher picks. */
export function useHomeworkAIDraft() {
  const [drafting, setDrafting] = useState(false);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const draft = useCallback(async (body: DraftBody): Promise<void> => {
    setDrafting(true);
    setError(null);
    try {
      const res = await apiClient.post('/question-bank/questions/generate', body);
      setDrafts(unwrapList<Record<string, unknown>>(res).map((q) => toDraftQuestion(q)));
    } catch (err: unknown) {
      console.error('AI homework draft failed', err);
      setError(extractErrorMessage(err, 'The AI could not draft questions just now. Try again in a moment.'));
    } finally {
      setDrafting(false);
    }
  }, []);

  const keep = useCallback(async (ids: string[]): Promise<{ keptIds: string[]; failed: number }> => {
    const results = await Promise.allSettled(ids.map((id: string) => apiClient.post(`/question-bank/questions/${id}/save-to-bank`)));
    const keptIds = ids.filter((_, i) => results[i].status === 'fulfilled');
    results.forEach((r, i) => { if (r.status === 'rejected') console.error('Could not save drafted question', ids[i], r.reason); });
    return { keptIds, failed: ids.length - keptIds.length };
  }, []);

  const reset = useCallback(() => { setDrafts([]); setError(null); }, []);

  return { drafting, drafts, error, draft, keep, reset };
}
