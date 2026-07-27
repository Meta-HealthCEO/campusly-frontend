'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AxiosResponse } from 'axios';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface CurriculumTopic {
  _id: string;
  title: string;
  code?: string;
  parentId?: string | null;
  type?: 'topic' | 'subtopic';
}

export interface CurriculumTopicTreeNode {
  id: string;
  title: string;
  code?: string;
  subtopics: Array<{ id: string; title: string; code?: string }>;
}

interface UseCurriculumTopicsParams {
  subjectId: string;
  gradeId: string;
}

interface UseCurriculumTopicsResult {
  topics: CurriculumTopic[];
  loading: boolean;
}

/**
 * Lists curriculum nodes of type=topic for a given subject + grade.
 * Backend route: GET /api/curriculum-structure/nodes
 *
 * The hook is a no-op until both subjectId and gradeId are provided.
 * On error, sets topics to [] silently (callers render an empty state).
 */
export function useCurriculumTopics(
  params: UseCurriculumTopicsParams,
): UseCurriculumTopicsResult {
  const { subjectId, gradeId } = params;
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId || !gradeId) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/curriculum-structure/nodes', {
        params: { type: 'topic', subjectId, gradeId },
      })
      .then((res: AxiosResponse) => {
        if (!cancelled) setTopics(unwrapList<CurriculumTopic>(res));
      })
      .catch((err: unknown) => {
        console.error('Failed to load curriculum topics', err);
        if (!cancelled) setTopics([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId, gradeId]);

  return { topics, loading };
}

/**
 * Like `useCurriculumTopics` but also fetches subtopics in the same call,
 * grouped into a tree: each topic carries its subtopics underneath it. The
 * backend `types` (plural) query param accepts a comma-separated list, so we
 * grab both `topic` and `subtopic` in one round-trip.
 */
export function useCurriculumTopicTree(
  params: UseCurriculumTopicsParams,
): { tree: CurriculumTopicTreeNode[]; loading: boolean } {
  const { subjectId, gradeId } = params;
  const [nodes, setNodes] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId || !gradeId) {
      setNodes([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/curriculum-structure/nodes', {
        // Backend caps `limit` at 200 — passing more 400s the whole request.
        params: { types: 'topic,subtopic', subjectId, gradeId, limit: 200 },
      })
      .then((res: AxiosResponse) => {
        if (!cancelled) setNodes(unwrapList<CurriculumTopic>(res));
      })
      .catch((err: unknown) => {
        console.error('Failed to load curriculum topic tree', err);
        if (!cancelled) setNodes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId, gradeId]);

  const tree = useMemo<CurriculumTopicTreeNode[]>(() => {
    const topics = nodes.filter((n) => (n.type ?? 'topic') === 'topic');
    const subtopics = nodes.filter((n) => n.type === 'subtopic');
    const byParent = new Map<string, CurriculumTopic[]>();
    for (const sub of subtopics) {
      const parentId = sub.parentId ?? '';
      if (!parentId) continue;
      const list = byParent.get(parentId) ?? [];
      list.push(sub);
      byParent.set(parentId, list);
    }
    return topics.map((topic) => ({
      id: topic._id,
      title: topic.title,
      code: topic.code,
      subtopics: (byParent.get(topic._id) ?? []).map((sub) => ({
        id: sub._id,
        title: sub.title,
        code: sub.code,
      })),
    }));
  }, [nodes]);

  return { tree, loading };
}
