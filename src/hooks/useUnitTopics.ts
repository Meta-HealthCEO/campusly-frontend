'use client';

import { useEffect, useState } from 'react';
import type { AxiosResponse } from 'axios';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface UnitTopic {
  id: string;
  title: string;
  description?: string;
  metadata?: { weekNumbers?: number[]; capsReference?: string };
}

/** The CAPS topics for a subject, grade and term: what a unit can cover. */
export function useUnitTopics(subjectId: string, gradeId: string, termNumber: number) {
  const [topics, setTopics] = useState<UnitTopic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId || !gradeId) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return apiClient.get('/curriculum-structure/nodes', { params: { type: 'topic', subjectId, gradeId, termNumber } });
      })
      .then((res: AxiosResponse) => { if (!cancelled) setTopics(unwrapList<UnitTopic>(res)); })
      .catch((err: unknown) => {
        console.error('Failed to load CAPS topics', err);
        if (!cancelled) setTopics([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subjectId, gradeId, termNumber]);

  return { topics: subjectId && gradeId ? topics : [], loading };
}

/** "Weeks 4–7" from a topic's ATP weeks. */
export function topicWeeks(topic: UnitTopic): string {
  const weeks = topic.metadata?.weekNumbers ?? [];
  if (weeks.length === 0) return '';
  const first = Math.min(...weeks);
  const last = Math.max(...weeks);
  return first === last ? `Week ${first}` : `Weeks ${first}–${last}`;
}

/**
 * The ticked topics that will actually be sent: a unit covers at most `max`
 * topics, so once that many are ticked, later ones in the list don't count
 * even though nothing unticked them.
 */
export function selectedTopics(topics: UnitTopic[], unticked: Set<string>, max: number): UnitTopic[] {
  return topics.filter((t) => !unticked.has(t.id)).slice(0, max);
}
