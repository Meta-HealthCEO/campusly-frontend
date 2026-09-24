'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { SubjectWeightingMatrix } from '@/hooks/useSubjectWeightings';

const EMPTY: Map<string, SubjectWeightingMatrix> = new Map();
const EMPTY_FAILED: Set<string> = new Set();

interface WeightingsLoadResult {
  matrices: Map<string, SubjectWeightingMatrix>;
  /** Subjects whose fetch failed — kept separate from "no weightings set" so a network error doesn't read as "Not set". */
  failedSubjectIds: Set<string>;
}

async function loadWeightings(requestKey: string): Promise<WeightingsLoadResult> {
  const [gradeId, idList] = requestKey.split('|');
  const ids = idList.split(',');
  const results = await Promise.allSettled(ids.map((subjectId: string) =>
    apiClient.get('/academic/subject-weightings/matrix', { params: { subjectId, gradeId } })));
  const matrices = new Map<string, SubjectWeightingMatrix>();
  const failedSubjectIds = new Set<string>();
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') matrices.set(ids[i], unwrapResponse<SubjectWeightingMatrix>(result.value));
    else {
      failedSubjectIds.add(ids[i]);
      console.error('Failed to load weightings for subject', ids[i], result.reason);
    }
  });
  return { matrices, failedSubjectIds };
}

/** Every listed subject's weightings for one grade, loaded together. A subject that fails to load reports itself in `failedSubjectIds` rather than looking identical to "not set". */
export function useGradeWeightings(gradeId: string | null, subjectIds: readonly string[]) {
  const requestKey = gradeId && subjectIds.length > 0 ? `${gradeId}|${subjectIds.join(',')}` : '';
  const [loaded, setLoaded] = useState<{ key: string } & WeightingsLoadResult>(
    { key: '', matrices: EMPTY, failedSubjectIds: EMPTY_FAILED },
  );
  // The most recent requestKey the hook is supposed to be showing — used to
  // drop a `refetch()` that resolves after the class/subjects changed again.
  const latestKeyRef = useRef(requestKey);
  useEffect(() => { latestKeyRef.current = requestKey; }, [requestKey]);

  const refetch = useCallback(async () => {
    if (!requestKey) return;
    const key = requestKey;
    const result = await loadWeightings(key);
    // A slower earlier refetch landing after a newer class switch must not
    // clobber the newer selection's already-loaded state.
    if (latestKeyRef.current !== key) return;
    setLoaded({ key, ...result });
  }, [requestKey]);

  useEffect(() => {
    if (!requestKey) return undefined;
    let active = true;
    loadWeightings(requestKey).then((result) => {
      if (active) setLoaded({ key: requestKey, ...result });
    });
    return () => { active = false; };
  }, [requestKey]);

  const current = requestKey && loaded.key === requestKey ? loaded : null;
  return {
    matrices: current?.matrices ?? EMPTY,
    failedSubjectIds: current?.failedSubjectIds ?? EMPTY_FAILED,
    loading: requestKey !== '' && loaded.key !== requestKey,
    refetch,
  };
}
