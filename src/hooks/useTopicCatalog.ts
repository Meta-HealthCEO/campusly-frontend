'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CurriculumNodeItem } from '@/types';

export interface TopicCatalogParams {
  frameworkId: string;
  subjectId: string;
  gradeId: string;
  /** Optional — if omitted, all terms. */
  termNumber?: number;
}

export interface TopicCatalogResult {
  topics: CurriculumNodeItem[];
  subtopics: CurriculumNodeItem[];
  loading: boolean;
}

/**
 * Fetches topics + subtopics for the new-lesson topic picker. Single
 * `/curriculum-structure/nodes` call filtered by denormalized refs
 * (subjectId, gradeId, optional termNumber) so the API returns only
 * what the teacher needs — no tree traversal required.
 *
 * The hook fans the response out into two arrays so the picker can
 * group subtopics under their parent without re-walking parentId.
 */
export function useTopicCatalog(params: TopicCatalogParams): TopicCatalogResult {
  const { frameworkId, subjectId, gradeId, termNumber } = params;
  const [topics, setTopics] = useState<CurriculumNodeItem[]>([]);
  const [subtopics, setSubtopics] = useState<CurriculumNodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!frameworkId || !subjectId || !gradeId) {
      setTopics([]);
      setSubtopics([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const query: Record<string, string | number> = {
          frameworkId,
          subjectId,
          gradeId,
          types: 'topic,subtopic',
          limit: 200,
        };
        if (termNumber !== undefined) query.termNumber = termNumber;

        const response = await apiClient.get('/curriculum-structure/nodes', { params: query });
        const result = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(response);
        if (cancelled) return;

        const allTopics: CurriculumNodeItem[] = [];
        const allSubtopics: CurriculumNodeItem[] = [];
        for (const node of result.nodes) {
          if (node.type === 'topic') allTopics.push(node);
          else if (node.type === 'subtopic') allSubtopics.push(node);
        }
        setTopics(allTopics);
        setSubtopics(allSubtopics);
      } catch (err: unknown) {
        if (!cancelled) {
          console.warn('Failed to load topic catalog', err);
          setTopics([]);
          setSubtopics([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [frameworkId, subjectId, gradeId, termNumber]);

  return { topics, subtopics, loading };
}
