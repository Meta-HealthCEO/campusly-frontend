'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { toISODate } from '@/lib/utils';
import { summariseMarkingDue } from '@/lib/marking-due';
import {
  annotatePeriods,
  lessonsByClassForDay,
  summariseToday,
  type AnnotatedPeriod,
  type LessonForDayInput,
  type LessonLink,
  type TodayPeriod,
} from '@/lib/teacher-today';
import { useAuthStore } from '@/stores/useAuthStore';
import type { MarkingItem } from '@/types';

const TICK_MS = 60_000;

export interface TodayMarking {
  /** False when the school doesn't have the marking hub (teacher_workbench). */
  available: boolean;
  pending: number;
  overdue: number;
  dueToday: number;
}

export interface TeacherToday {
  loading: boolean;
  periods: AnnotatedPeriod[];
  lessonsByClass: Map<string, LessonLink>;
  marking: TodayMarking;
  /** Null for independent teachers, who have no parent messaging. */
  unreadMessages: number | null;
  summary: string[];
  isWeekend: boolean;
  refetch: () => Promise<void>;
}

function settled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

/**
 * Everything the teacher's Today home needs, from existing endpoints. Each
 * source is independent: a module a school hasn't enabled (403) just hides
 * that part of the page instead of failing the whole view.
 */
export function useTeacherToday(): TeacherToday {
  const isStandalone = useAuthStore((s) => s.user?.isStandaloneTeacher === true);
  const [loading, setLoading] = useState(true);
  const [rawPeriods, setRawPeriods] = useState<TodayPeriod[]>([]);
  const [markingItems, setMarkingItems] = useState<MarkingItem[] | null>(null);
  const [lessons, setLessons] = useState<LessonForDayInput[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());

  const fetchAll = useCallback(async () => {
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    // `loading` starts true; refetches update in place without a skeleton flash.
    try {
      const [periodsRes, markingRes, lessonsRes, unreadRes] = await Promise.allSettled([
        apiClient.get('/attendance/register-status', { params: { date: toISODate(today) } }),
        apiClient.get('/teacher-workbench/marking-hub/pending'),
        apiClient.get('/lessons', {
          params: { dateFrom: dayStart.toISOString(), dateTo: dayEnd.toISOString(), limit: 50 },
        }),
        isStandalone ? Promise.reject(new Error('no messaging')) : apiClient.get('/messaging/unread-count'),
      ]);

      const periods = settled(periodsRes);
      setRawPeriods(periods ? unwrapList<TodayPeriod>(periods) : []);

      const marking = settled(markingRes);
      setMarkingItems(marking ? unwrapList<MarkingItem>(marking) : null);

      const lessonPage = settled(lessonsRes);
      setLessons(lessonPage ? unwrapResponse<{ items?: LessonForDayInput[] }>(lessonPage).items ?? [] : []);

      const unread = settled(unreadRes);
      setUnreadMessages(unread ? unwrapResponse<{ totalUnread?: number }>(unread).totalUnread ?? 0 : null);
      setNow(new Date());
    } catch (err: unknown) {
      console.error('Failed to load the teacher Today view', err);
    } finally {
      setLoading(false);
    }
  }, [isStandalone]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const periods = useMemo(() => annotatePeriods(rawPeriods, now), [rawPeriods, now]);
  const lessonsByClass = useMemo(() => lessonsByClassForDay(lessons, now), [lessons, now]);

  const marking = useMemo<TodayMarking>(() => {
    if (!markingItems) return { available: false, pending: 0, overdue: 0, dueToday: 0 };
    const due = summariseMarkingDue(markingItems, now);
    const pending = markingItems.reduce((sum: number, item: MarkingItem) => sum + item.pendingCount, 0);
    return { available: true, pending, overdue: due.overdue, dueToday: due.dueToday };
  }, [markingItems, now]);

  const summary = useMemo(
    () => summariseToday({ periods, markingPending: marking.pending, unreadMessages: unreadMessages ?? 0 }),
    [periods, marking.pending, unreadMessages],
  );

  const weekday = now.getDay();
  return {
    loading,
    periods,
    lessonsByClass,
    marking,
    unreadMessages,
    summary,
    isWeekend: weekday === 0 || weekday === 6,
    refetch: fetchAll,
  };
}
