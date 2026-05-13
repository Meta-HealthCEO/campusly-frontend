'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  AssignedPaperSummary,
  StudentPaperView,
  SubmissionResult,
  SubmissionAnswer,
} from '@/types/papers';

/** List of digital papers assigned to the current student's class. */
export function useStudentAssignedPapers(): {
  papers: AssignedPaperSummary[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [papers, setPapers] = useState<AssignedPaperSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/question-bank/student/papers');
      setPapers(unwrapResponse<AssignedPaperSummary[]>(res));
    } catch (err: unknown) {
      console.error('Failed to load assigned papers', err);
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  return { papers, loading, refetch };
}

interface UseStudentTestTakeResult {
  paper: StudentPaperView | null;
  submission: SubmissionResult | null;
  loading: boolean;
  saving: boolean;
  submitting: boolean;
  save: (answers: SubmissionAnswer[]) => Promise<void>;
  submit: () => Promise<SubmissionResult | null>;
}

/**
 * Drives the test-take page: loads the paper (without memo), starts (or
 * resumes) a submission, exposes a `save` for autosave + a `submit` for the
 * final hand-off.
 */
export function useStudentTestTake(paperId: string | undefined): UseStudentTestTakeResult {
  const [paper, setPaper] = useState<StudentPaperView | null>(null);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!paperId) return;
    let cancelled = false;
    (async () => {
      try {
        const [paperRes, startRes] = await Promise.all([
          apiClient.get(`/question-bank/student/papers/${paperId}`),
          apiClient.post(`/question-bank/student/papers/${paperId}/start`),
        ]);
        if (cancelled) return;
        setPaper(unwrapResponse<StudentPaperView>(paperRes));
        setSubmission(unwrapResponse<SubmissionResult>(startRes));
      } catch (err: unknown) {
        if (cancelled) return;
        toast.error(extractErrorMessage(err, 'Could not open this test.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [paperId]);

  const save = useCallback(async (answers: SubmissionAnswer[]): Promise<void> => {
    if (!submission) return;
    setSaving(true);
    try {
      const res = await apiClient.put(
        `/question-bank/student/submissions/${submission.submissionId}`,
        { answers },
      );
      setSubmission(unwrapResponse<SubmissionResult>(res));
    } catch (err: unknown) {
      // Silent autosave failure — too noisy to toast on every blip.
      console.warn('Autosave failed', err);
    } finally {
      setSaving(false);
    }
  }, [submission]);

  const submit = useCallback(async (): Promise<SubmissionResult | null> => {
    if (!submission) return null;
    setSubmitting(true);
    try {
      const res = await apiClient.post(
        `/question-bank/student/submissions/${submission.submissionId}/submit`,
      );
      const updated = unwrapResponse<SubmissionResult>(res);
      setSubmission(updated);
      toast.success('Test submitted — your teacher will review it.');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Submit failed. Try again.'));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [submission]);

  return { paper, submission, loading, saving, submitting, save, submit };
}
