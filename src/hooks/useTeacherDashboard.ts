import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toISODate } from '@/lib/utils';
import type {
  Homework,
  Subject,
  Lesson,
  TodayItem,
  GradingItem,
  DraftItem,
} from '@/types';

interface DashboardData {
  today: TodayItem[];
  todayTotal: number;
  grading: GradingItem[];
  gradingTotal: number;
  drafts: DraftItem[];
  draftsTotal: number;
  loading: boolean;
}

function resolveMaybeId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return '';
  const record = value as { id?: unknown; _id?: unknown };
  if (typeof record.id === 'string') return record.id;
  if (typeof record._id === 'string') return record._id;
  return '';
}

const REFETCH_THROTTLE_MS = 30_000;

export function useTeacherDashboard(): DashboardData {
  const { user } = useAuthStore();
  const [today, setToday] = useState<TodayItem[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [grading, setGrading] = useState<GradingItem[]>([]);
  const [gradingTotal, setGradingTotal] = useState(0);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const lastFetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    lastFetchRef.current = Date.now();
    const todayIso = toISODate(new Date());

    try {
      const [homeworkRes, lessonsRes, subjectsRes] = await Promise.allSettled([
        apiClient.get('/homework'),
        apiClient.get('/lessons'),
        apiClient.get('/academic/subjects'),
      ]);

      // Build a subjectId → name map.
      const subjectMap = new Map<string, string>();
      if (subjectsRes.status === 'fulfilled') {
        const subjects = unwrapList<Subject>(subjectsRes.value);
        for (const s of subjects) {
          const sid = resolveMaybeId(s);
          if (sid) subjectMap.set(sid, s.name ?? '');
        }
      }
      const subjectNameOf = (subjectId: unknown): string => {
        const sid = resolveMaybeId(subjectId);
        return sid ? (subjectMap.get(sid) ?? '') : '';
      };

      // ── Today ────────────────────────────────────────────────────────────
      // Homework due today + lessons with an assigned class scheduled for
      // today. Papers excluded — GeneratedPaper has no scheduled-for-date
      // field on the model.
      const todayItems: TodayItem[] = [];

      if (homeworkRes.status === 'fulfilled') {
        const homework = unwrapList<Homework>(homeworkRes.value).filter(
          (h) => h.teacherId === user.id,
        );
        for (const h of homework) {
          if (!h.dueDate) continue;
          if (toISODate(new Date(h.dueDate)) !== todayIso) continue;
          todayItems.push({
            kind: 'homework',
            id: h._id,
            title: h.title,
            subject: subjectNameOf(h.subjectId),
            dueDate:
              typeof h.dueDate === 'string'
                ? h.dueDate
                : new Date(h.dueDate).toISOString(),
          });
        }
      }

      if (lessonsRes.status === 'fulfilled') {
        const lessons = unwrapList<Lesson>(lessonsRes.value).filter(
          (l) => resolveMaybeId(l.teacherId) === user.id,
        );
        for (const l of lessons) {
          // Lesson scheduling lives on assignedClasses[].scheduledDate; a
          // lesson can be scheduled for multiple classes — surface it once
          // if any delivery falls on today.
          const todayDelivery = (l.assignedClasses ?? []).find(
            (a) => a.scheduledDate && toISODate(new Date(a.scheduledDate)) === todayIso,
          );
          if (!todayDelivery) continue;
          todayItems.push({
            kind: 'lesson',
            id: resolveMaybeId(l),
            title: l.title,
            subject: subjectNameOf(l.subjectId),
            scheduledDate:
              typeof todayDelivery.scheduledDate === 'string'
                ? todayDelivery.scheduledDate
                : new Date(todayDelivery.scheduledDate).toISOString(),
          });
        }
      }

      todayItems.sort((a, b) => {
        const ta = a.kind === 'homework' ? a.dueDate : a.scheduledDate;
        const tb = b.kind === 'homework' ? b.dueDate : b.scheduledDate;
        return new Date(ta).getTime() - new Date(tb).getTime();
      });
      setTodayTotal(todayItems.length);
      setToday(todayItems.slice(0, 3));

      // ── Grading (homework only, per spec) ────────────────────────────────
      const gradingAll: GradingItem[] = [];
      if (homeworkRes.status === 'fulfilled') {
        const homework = unwrapList<Homework>(homeworkRes.value).filter(
          (h) => h.teacherId === user.id,
        );
        // N+1 fetch acceptable for MVP — matches current pattern.
        const submissionResults = await Promise.allSettled(
          homework.map((h) => apiClient.get(`/homework/${h._id}/submissions`)),
        );
        homework.forEach((h, idx) => {
          const sub = submissionResults[idx];
          if (sub.status !== 'fulfilled') return;
          const subs = unwrapList<Record<string, unknown>>(sub.value);
          const submittedSubs = subs.filter((s) => s.status === 'submitted');
          if (submittedSubs.length === 0) return;
          const graded = submittedSubs.filter(
            (s) => s.grade !== undefined && s.grade !== null,
          ).length;
          if (graded >= submittedSubs.length) return; // fully graded
          const oldest = submittedSubs
            .map((s) => new Date(String(s.submittedAt ?? s.createdAt ?? '')).getTime())
            .filter((t) => !Number.isNaN(t))
            .sort((a, b) => a - b)[0];
          gradingAll.push({
            kind: 'homework',
            id: h._id,
            title: h.title,
            subject: subjectNameOf(h.subjectId),
            totalSubmissions: submittedSubs.length,
            gradedCount: graded,
            oldestSubmittedAt: oldest ? new Date(oldest).toISOString() : '',
          });
        });
      }
      gradingAll.sort(
        (a, b) =>
          new Date(a.oldestSubmittedAt || 0).getTime() -
          new Date(b.oldestSubmittedAt || 0).getTime(),
      );
      setGradingTotal(gradingAll.length);
      setGrading(gradingAll.slice(0, 3));

      // ── Drafts (lessons with publishedAt == null) ───────────────────────
      const draftsAll: DraftItem[] = [];
      if (lessonsRes.status === 'fulfilled') {
        const lessons = unwrapList<Lesson>(lessonsRes.value).filter(
          (l) => resolveMaybeId(l.teacherId) === user.id && l.publishedAt == null,
        );
        for (const l of lessons) {
          draftsAll.push({
            kind: 'lesson',
            id: resolveMaybeId(l),
            title: l.title,
            updatedAt:
              typeof l.updatedAt === 'string'
                ? l.updatedAt
                : new Date(String(l.updatedAt ?? Date.now())).toISOString(),
          });
        }
      }
      draftsAll.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setDraftsTotal(draftsAll.length);
      setDrafts(draftsAll.slice(0, 3));
    } catch (err: unknown) {
      console.error('Failed to load teacher home dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Refetch on tab focus, debounced.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current < REFETCH_THROTTLE_MS) return;
      void fetchData();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchData]);

  return {
    today,
    todayTotal,
    grading,
    gradingTotal,
    drafts,
    draftsTotal,
    loading,
  };
}
