'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CurriculumFrameworkItem, CurriculumNodeItem } from '@/types';

export interface CapsGradeWithSubjects {
  grade: CurriculumNodeItem;
  subjects: CurriculumNodeItem[];
}

export function useCapsGrades() {
  const [grades, setGrades] = useState<CurriculumNodeItem[]>([]);
  const [frameworkId, setFrameworkId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadGrades = useCallback(async () => {
    setLoading(true);
    try {
      const fwRes = await apiClient.get('/curriculum-structure/frameworks');
      const frameworks = unwrapResponse<CurriculumFrameworkItem[]>(fwRes);
      const fwList = Array.isArray(frameworks) ? frameworks : [];
      const defaultFw = fwList.find((f) => f.isDefault) ?? fwList[0];
      if (!defaultFw) { setLoading(false); return; }
      setFrameworkId(defaultFw.id);

      const nodesRes = await apiClient.get('/curriculum-structure/nodes', {
        params: { frameworkId: defaultFw.id, type: 'grade', limit: 50 },
      });
      const result = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(nodesRes);
      const sorted = [...result.nodes].sort((a, b) => a.order - b.order);
      setGrades(sorted);
    } catch (err: unknown) {
      console.error('Failed to load CAPS grades', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadGrades(); }, [loadGrades]);

  return { grades, frameworkId, loading };
}

export function useCapsSubjects(gradeId: string, frameworkId: string) {
  const [subjects, setSubjects] = useState<CurriculumNodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gradeId || !frameworkId) { setLoading(false); return; }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.get('/curriculum-structure/nodes', {
          params: { frameworkId, parentId: gradeId, type: 'subject', limit: 100 },
        });
        const result = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(res);
        if (!cancelled) setSubjects([...result.nodes].sort((a, b) => a.order - b.order));
      } catch (err: unknown) {
        console.error('Failed to load subjects for grade', gradeId, err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [gradeId, frameworkId]);

  return { subjects, loading };
}

/**
 * Load CAPS topics for a given subject node. Uses the denormalized `subjectId`
 * filter so topics that live under a term sub-tree are still returned.
 */
export function useCapsTopics(subjectNodeId: string, frameworkId: string) {
  const [topics, setTopics] = useState<CurriculumNodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectNodeId || !frameworkId) {
      setTopics([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.get('/curriculum-structure/nodes', {
          params: { frameworkId, subjectId: subjectNodeId, type: 'topic', limit: 200 },
        });
        const result = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(res);
        if (!cancelled) {
          setTopics([...result.nodes].sort((a, b) => a.order - b.order));
        }
      } catch (err: unknown) {
        console.error('Failed to load topics for subject', subjectNodeId, err);
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [subjectNodeId, frameworkId]);

  return { topics, loading };
}
