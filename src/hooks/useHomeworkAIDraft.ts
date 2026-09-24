'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapList } from '@/lib/api-helpers';
import {
  draftFailure,
  toDraftQuestion,
  unsavedDrafts,
  type DraftFailure,
  type DraftQuestion,
  type draftRequest,
} from '@/lib/homework-ai-draft';

type DraftBody = ReturnType<typeof draftRequest>;

function statusOf(err: unknown): number | undefined {
  const status = (err as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

/** Draft exercise questions with the question bank's AI, then keep (approve) the ones the teacher picks. */
export function useHomeworkAIDraft() {
  const [drafting, setDrafting] = useState(false);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [failure, setFailure] = useState<DraftFailure | null>(null);

  const draft = useCallback(async (body: DraftBody): Promise<void> => {
    setDrafting(true);
    setFailure(null);
    try {
      const res = await apiClient.post('/question-bank/questions/generate', body);
      setDrafts(unwrapList<Record<string, unknown>>(res).map((q) => toDraftQuestion(q)));
    } catch (err: unknown) {
      console.error('AI homework draft failed', err);
      setFailure(draftFailure(statusOf(err), extractErrorMessage(err, '') || undefined));
    } finally {
      setDrafting(false);
    }
  }, []);

  /** Approves the chosen drafts; the ones that couldn't be saved stay in the list to try again. */
  const keep = useCallback(async (ids: string[]): Promise<{ keptIds: string[]; failed: number }> => {
    const results = await Promise.allSettled(ids.map((id: string) => apiClient.post(`/question-bank/questions/${id}/save-to-bank`)));
    const keptIds = ids.filter((_, i) => results[i].status === 'fulfilled');
    results.forEach((r, i) => { if (r.status === 'rejected') console.error('Could not save drafted question', ids[i], r.reason); });
    setDrafts((prev: DraftQuestion[]) => unsavedDrafts(prev, keptIds));
    return { keptIds, failed: ids.length - keptIds.length };
  }, []);

  const reset = useCallback(() => { setDrafts([]); setFailure(null); }, []);

  return { drafting, drafts, failure, draft, keep, reset };
}
