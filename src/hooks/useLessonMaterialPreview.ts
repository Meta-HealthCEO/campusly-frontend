import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { LessonMaterial } from '@/types/lesson';
import type { QuestionItem } from '@/types/question-bank';

interface PopulatedRef {
  _id?: string;
  id?: string;
}

function extractId(ref: unknown): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    const o = ref as PopulatedRef;
    return o._id ?? o.id ?? null;
  }
  return null;
}

export function useLessonMaterialPreview(material: LessonMaterial, enabled: boolean) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [resourceBlocks, setResourceBlocks] = useState<unknown[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    setError(null);

    const load = async () => {
      try {
        setBusy(true);

        if (
          material.kind === 'worksheet'
          || material.kind === 'activity'
          || material.kind === 'study_notes'
          || material.kind === 'worked_example'
        ) {
          const id = extractId(material.contentResourceId);
          if (!id) { setLoaded(true); return; }
          const res = await apiClient.get(`/content-library/resources/${id}`);
          const data = unwrapResponse<{ blocks?: unknown[] }>(res);
          setResourceBlocks(data.blocks ?? []);
          setLoaded(true);
          return;
        }

        if (material.kind === 'practice_questions') {
          const qs = (material.questionIds ?? [])
            .map((q) => (typeof q === 'object' ? (q as unknown as QuestionItem) : null))
            .filter((q): q is QuestionItem => !!q);
          if (qs.length > 0) { setQuestions(qs); setLoaded(true); return; }
          const ids = (material.questionIds ?? [])
            .map((q) => extractId(q))
            .filter((s): s is string => !!s);
          if (ids.length === 0) { setLoaded(true); return; }
          const res = await apiClient.get('/question-bank/questions', { params: { ids: ids.join(',') } });
          const data = unwrapResponse<{ items?: QuestionItem[] }>(res);
          setQuestions(data.items ?? []);
          setLoaded(true);
          return;
        }

        if (material.kind === 'homework') {
          const id = extractId(material.homeworkId);
          if (!id) { setLoaded(true); return; }
          const res = await apiClient.get(`/homework/${id}`);
          const data = unwrapResponse<{
            type?: string;
            exerciseQuestions?: QuestionItem[];
            exerciseQuestionIds?: QuestionItem[];
          }>(res);
          setQuestions(data.exerciseQuestions ?? data.exerciseQuestionIds ?? []);
          setLoaded(true);
          return;
        }

        if (material.kind === 'reading') {
          const qs = (material.comprehensionQuestionIds ?? [])
            .map((q) => (typeof q === 'object' ? (q as unknown as QuestionItem) : null))
            .filter((q): q is QuestionItem => !!q);
          setQuestions(qs);
          setLoaded(true);
          return;
        }

        setLoaded(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load content';
        setError(msg);
      } finally {
        setBusy(false);
      }
    };
    void load();
  }, [enabled, loaded, material]);

  return { busy, error, questions, resourceBlocks };
}
