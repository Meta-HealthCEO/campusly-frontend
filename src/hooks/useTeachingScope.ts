'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { buildTeachingScope } from '@/lib/teaching-scope';
import type { CurriculumFrameworkItem, CurriculumNodeItem, TeachingScope } from '@/types';

const EMPTY: TeachingScope = { grades: [], subjectsByGrade: [] };

export function useTeachingScope() {
  const [scope, setScope] = useState<TeachingScope>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/teacher-settings/teaching-scope');
      const data = unwrapResponse<TeachingScope>(res);
      setScope({
        grades: data?.grades ?? [],
        subjectsByGrade: data?.subjectsByGrade ?? [],
      });
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load teaching scope', err);
      setError('Could not load teaching scope');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (next: TeachingScope): Promise<TeachingScope | null> => {
    try {
      const res = await apiClient.put('/teacher-settings/teaching-scope', next);
      const data = unwrapResponse<TeachingScope>(res);
      const saved: TeachingScope = {
        grades: data?.grades ?? [],
        subjectsByGrade: data?.subjectsByGrade ?? [],
      };
      setScope(saved);
      return saved;
    } catch (err: unknown) {
      console.error('Failed to save teaching scope', err);
      return null;
    }
  }, []);

  /**
   * Onboarding picks grades/subjects by name; resolve them to CAPS nodes on
   * the default framework and save, so the teacher isn't asked again later.
   */
  const saveFromNames = useCallback(async (
    gradeNames: string[],
    subjectNames: string[],
  ): Promise<TeachingScope | null> => {
    try {
      const fwRes = await apiClient.get('/curriculum-structure/frameworks');
      const frameworks = unwrapResponse<CurriculumFrameworkItem[]>(fwRes);
      const fwList = Array.isArray(frameworks) ? frameworks : [];
      const framework = fwList.find((f: CurriculumFrameworkItem) => f.isDefault) ?? fwList[0];
      if (!framework) return null;

      const gradeRes = await apiClient.get('/curriculum-structure/nodes', {
        params: { frameworkId: framework.id, type: 'grade', limit: 50 },
      });
      const gradeNodes = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(gradeRes).nodes ?? [];
      const picked = buildTeachingScope(gradeNames, [], gradeNodes, {}).grades;

      const subjectsByGradeId: Record<string, CurriculumNodeItem[]> = {};
      for (const gradeId of picked) {
        const res = await apiClient.get('/curriculum-structure/nodes', {
          params: { frameworkId: framework.id, parentId: gradeId, type: 'subject', limit: 100 },
        });
        subjectsByGradeId[gradeId] = unwrapResponse<{ nodes: CurriculumNodeItem[] }>(res).nodes ?? [];
      }

      const next = buildTeachingScope(gradeNames, subjectNames, gradeNodes, subjectsByGradeId);
      if (next.grades.length === 0) return null;
      return await save(next);
    } catch (err: unknown) {
      console.error('Failed to set teaching scope from onboarding', err);
      return null;
    }
  }, [save]);

  useEffect(() => { void fetch(); }, [fetch]);

  return {
    scope, loading, error, refetch: fetch, save, saveFromNames,
    isEmpty: scope.grades.length === 0,
  };
}
