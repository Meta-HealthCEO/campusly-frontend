'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { SubjectWeightingMatrix } from '@/hooks/useSubjectWeightings';

const EMPTY: Map<string, SubjectWeightingMatrix> = new Map();

async function loadWeightings(requestKey: string): Promise<Map<string, SubjectWeightingMatrix>> {
  const [gradeId, idList] = requestKey.split('|');
  const ids = idList.split(',');
  const results = await Promise.allSettled(ids.map((subjectId: string) =>
    apiClient.get('/academic/subject-weightings/matrix', { params: { subjectId, gradeId } })));
  const next = new Map<string, SubjectWeightingMatrix>();
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') next.set(ids[i], unwrapResponse<SubjectWeightingMatrix>(result.value));
    else console.error('Failed to load weightings for subject', ids[i], result.reason);
  });
  return next;
}

/** Every listed subject's weightings for one grade, loaded together. A subject that fails to load is simply absent. */
export function useGradeWeightings(gradeId: string | null, subjectIds: readonly string[]) {
  const requestKey = gradeId && subjectIds.length > 0 ? `${gradeId}|${subjectIds.join(',')}` : '';
  const [loaded, setLoaded] = useState<{ key: string; matrices: Map<string, SubjectWeightingMatrix> }>({ key: '', matrices: EMPTY });

  const refetch = useCallback(async () => {
    if (!requestKey) return;
    setLoaded({ key: requestKey, matrices: await loadWeightings(requestKey) });
  }, [requestKey]);

  useEffect(() => {
    if (!requestKey) return undefined;
    let active = true;
    loadWeightings(requestKey).then((matrices) => {
      if (active) setLoaded({ key: requestKey, matrices });
    });
    return () => { active = false; };
  }, [requestKey]);

  return {
    matrices: requestKey && loaded.key === requestKey ? loaded.matrices : EMPTY,
    loading: requestKey !== '' && loaded.key !== requestKey,
    refetch,
  };
}
