'use client';

import { useEffect, useState } from 'react';
import { submissionsToMark } from '@/lib/marking-due';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import type { NavCounts } from '@/lib/nav-counts';
import type { MarkingItem } from '@/types';

const REFRESH_MS = 5 * 60 * 1000;

/** Marking and unread-message counts for the teacher nav. Failures just hide the badge. */
export function useTeacherNavCounts(enabled: boolean): NavCounts {
  const [counts, setCounts] = useState<NavCounts>({ marking: null, messages: null });
  const isStandalone = useAuthStore((s) => s.user?.isStandaloneTeacher === true);
  const workbenchOn = useSchoolStore((s) => s.school?.modulesEnabled.includes('teacher_workbench') ?? false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      const [marking, messages] = await Promise.allSettled([
        workbenchOn ? apiClient.get('/teacher-workbench/marking-hub/pending') : Promise.reject(new Error('off')),
        isStandalone ? Promise.reject(new Error('no messaging')) : apiClient.get('/messaging/unread-count'),
      ]);
      if (cancelled) return;
      setCounts({
        marking: marking.status === 'fulfilled'
          ? submissionsToMark(unwrapList<MarkingItem>(marking.value))
          : null,
        messages: messages.status === 'fulfilled'
          ? unwrapResponse<{ totalUnread?: number }>(messages.value).totalUnread ?? 0
          : null,
      });
    };
    void load();
    const id = window.setInterval(() => { void load(); }, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [enabled, workbenchOn, isStandalone]);

  return counts;
}
