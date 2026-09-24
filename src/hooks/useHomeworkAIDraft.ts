'use client';

import { useCallback, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapList } from '@/lib/api-helpers';
import {
  draftFailure,
  keepResult,
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
  // Aborted by reset() (Cancel) so a slow response can't land after the
  // teacher has moved on — otherwise a cancelled draft can silently
  // reappear, and a cancelled "Adding…" can still add.
  const draftAbortRef = useRef<AbortController | null>(null);
  const keepAbortRef = useRef<AbortController | null>(null);

  const draft = useCallback(async (body: DraftBody): Promise<void> => {
    draftAbortRef.current?.abort();
    const controller = new AbortController();
    draftAbortRef.current = controller;
    setDrafting(true);
    setFailure(null);
    try {
      const res = await apiClient.post('/question-bank/questions/generate', body, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setDrafts(unwrapList<Record<string, unknown>>(res).map((q) => toDraftQuestion(q)));
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      console.error('AI homework draft failed', err);
      setFailure(draftFailure(statusOf(err), extractErrorMessage(err, '') || undefined));
    } finally {
      setDrafting(false);
    }
  }, []);

  /**
   * Approves the chosen drafts; the ones that couldn't be saved stay in the
   * list to try again. Returns `null` when cancelled mid-flight — the
   * caller must treat that as "nothing happened", not as zero kept/zero
   * failed (which would read as a successful empty save).
   */
  const keep = useCallback(async (ids: string[]): Promise<{ keptIds: string[]; failed: number } | null> => {
    const controller = new AbortController();
    keepAbortRef.current = controller;
    const results = await Promise.allSettled(
      ids.map((id: string) => apiClient.post(`/question-bank/questions/${id}/save-to-bank`, undefined, { signal: controller.signal })),
    );
    results.forEach((r, i) => { if (r.status === 'rejected' && !controller.signal.aborted) console.error('Could not save drafted question', ids[i], r.reason); });
    const result = keepResult(ids, results, controller.signal.aborted);
    if (result) setDrafts((prev: DraftQuestion[]) => unsavedDrafts(prev, result.keptIds));
    return result;
  }, []);

  const reset = useCallback(() => {
    draftAbortRef.current?.abort();
    keepAbortRef.current?.abort();
    setDrafting(false);
    setDrafts([]);
    setFailure(null);
  }, []);

  return { drafting, drafts, failure, draft, keep, reset };
}
