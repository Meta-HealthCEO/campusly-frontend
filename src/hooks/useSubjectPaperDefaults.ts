'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { PaperDefaults, QuestionTypeWeight } from '@/types/papers';

interface SubjectRecord {
  id?: string;
  _id?: string;
  paperDefaults?: PaperDefaults | null;
}

/**
 * Fetch + save per-subject paper-generation defaults (specifically the
 * question-type mix). Defaults are loaded once when `subjectId` becomes
 * available and exposed for the wizard to pre-fill its advanced controls.
 *
 * Saving is a PATCH-style PUT against the existing `/academic/subjects/:id`
 * endpoint — that endpoint already accepts a partial body and the backend
 * has been extended to validate `paperDefaults`.
 */
export function useSubjectPaperDefaults(subjectId: string | undefined): {
  defaults: PaperDefaults | null;
  loading: boolean;
  saving: boolean;
  saveDefaults: (mix: QuestionTypeWeight[]) => Promise<boolean>;
} {
  const [defaults, setDefaults] = useState<PaperDefaults | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setDefaults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get(`/academic/subjects/${subjectId}`)
      .then((res) => {
        if (cancelled) return;
        const subject = unwrapResponse<SubjectRecord>(res);
        setDefaults(subject.paperDefaults ?? null);
      })
      .catch(() => {
        if (!cancelled) setDefaults(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const saveDefaults = useCallback(async (mix: QuestionTypeWeight[]): Promise<boolean> => {
    if (!subjectId) return false;
    setSaving(true);
    try {
      const res = await apiClient.put(`/academic/subjects/${subjectId}`, {
        paperDefaults: { questionTypeMix: mix },
      });
      const updated = unwrapResponse<SubjectRecord>(res);
      setDefaults(updated.paperDefaults ?? null);
      toast.success('Saved as default for this subject');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not save subject defaults'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [subjectId]);

  return { defaults, loading, saving, saveDefaults };
}
