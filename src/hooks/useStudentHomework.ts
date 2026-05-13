'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import {
  extractErrorMessage,
  resolveId,
  unwrapList,
  unwrapResponse,
} from '@/lib/api-helpers';
import { normalizeHomework, normalizeSubmission } from '@/lib/homework-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import type { Homework, HomeworkSubmission } from '@/types';
import type {
  StructuredHomeworkSubmission,
  SubmitHomeworkPayload,
} from '@/types/homework';

// ─── Consolidated student-facing DTO ────────────────────────────────────────

export interface StudentHomeworkItem {
  id: string;
  title: string;
  subject: string;
  subjectId?: string;
  type: 'quiz' | 'reading' | 'exercise';
  /** ISO date — derived from Homework.dueDate. */
  dueAt: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  mark?: number;
  totalMarks?: number;
  sourceLesson?: { id: string; title: string } | null;
}

export interface StudentHomeworkDetail extends StudentHomeworkItem {
  /** Rich underlying Homework record — preserved so detail consumers (I3)
   *  can render the type-specific submission forms which need the full
   *  discriminated union (quizId / exerciseQuestionIds / contentResourceId). */
  homework: Homework;
  description?: string;
  resourceUrl?: string;
  quizId?: string;
}

interface GroupedHomework {
  overdue: StudentHomeworkItem[];
  dueThisWeek: StudentHomeworkItem[];
  submitted: StudentHomeworkItem[];
  graded: StudentHomeworkItem[];
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function readSubjectName(raw: unknown): { id: string; name: string } {
  if (typeof raw === 'string') return { id: raw, name: 'Subject' };
  if (raw && typeof raw === 'object') {
    const obj = raw as { _id?: string; id?: string; name?: string };
    return {
      id: obj._id ?? obj.id ?? '',
      name: typeof obj.name === 'string' && obj.name.length > 0 ? obj.name : 'Subject',
    };
  }
  return { id: '', name: 'Subject' };
}

function buildItem(
  hw: Homework,
  rawSubject: unknown,
  submission: HomeworkSubmission | undefined,
  sourceLesson: { id: string; title: string } | null | undefined,
): StudentHomeworkItem {
  const subject = readSubjectName(rawSubject);
  const dueMs = new Date(hw.dueDate).getTime();
  const isPastDue = Number.isFinite(dueMs) && dueMs < Date.now();

  let status: StudentHomeworkItem['status'];
  if (submission) {
    status = submission.grade != null ? 'graded' : 'submitted';
  } else {
    status = isPastDue ? 'overdue' : 'pending';
  }

  return {
    id: hw._id,
    title: hw.title,
    subject: subject.name,
    subjectId: subject.id || hw.subjectId || undefined,
    type: hw.type,
    dueAt: hw.dueDate,
    status,
    mark: submission?.grade,
    totalMarks: hw.totalMarks,
    sourceLesson: sourceLesson ?? null,
  };
}

// ─── List hook ──────────────────────────────────────────────────────────────

interface StudentHomeworkListResult {
  items: StudentHomeworkItem[];
  grouped: GroupedHomework;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useStudentHomeworkList(): StudentHomeworkListResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [items, setItems] = useState<StudentHomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!student) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sid = resolveId(student);
      const classId = resolveId(student.classId);
      const [hwRes, subRes] = await Promise.allSettled([
        apiClient.get('/homework', { params: classId ? { classId } : undefined }),
        apiClient.get(`/homework/student/${sid}/submissions`),
      ]);

      let submissions: HomeworkSubmission[] = [];
      if (subRes.status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(subRes.value);
        submissions = arr.map((raw) =>
          normalizeSubmission(raw as Parameters<typeof normalizeSubmission>[0]),
        );
      }

      let next: StudentHomeworkItem[] = [];
      if (hwRes.status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(hwRes.value);
        next = arr
          .map((raw) => {
            const normalized = normalizeHomework(
              raw as Parameters<typeof normalizeHomework>[0],
            );
            if (normalized.status !== 'assigned') return null;
            const sub = submissions.find((s) => s.homeworkId === normalized._id);
            return buildItem(normalized, (raw as { subjectId?: unknown }).subjectId, sub, null);
          })
          .filter((x): x is StudentHomeworkItem => x !== null);
      }
      setItems(next);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (studentLoading) return;
    void refresh();
  }, [refresh, studentLoading]);

  const grouped = useMemo<GroupedHomework>(() => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return {
      overdue: items.filter((i) => i.status === 'overdue'),
      dueThisWeek: items.filter((i) => {
        if (i.status !== 'pending') return false;
        const d = new Date(i.dueAt).getTime();
        return Number.isFinite(d) && d >= now && d - now < oneWeek;
      }),
      submitted: items.filter((i) => i.status === 'submitted'),
      graded: items.filter((i) => i.status === 'graded'),
    };
  }, [items]);

  return {
    items,
    grouped,
    loading: studentLoading || loading,
    refresh,
  };
}

// ─── Detail hook ────────────────────────────────────────────────────────────

interface StudentHomeworkDetailResult {
  detail: StudentHomeworkDetail | null;
  /** Live submission record for type-specific forms (I3). */
  submission: StructuredHomeworkSubmission | null;
  loading: boolean;
  submitHomework: (
    payload: SubmitHomeworkPayload,
  ) => Promise<StructuredHomeworkSubmission | null>;
}

export function useStudentHomeworkDetail(
  homeworkId: string,
): StudentHomeworkDetailResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [detail, setDetail] = useState<StudentHomeworkDetail | null>(null);
  const [submission, setSubmission] = useState<StructuredHomeworkSubmission | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const hwRes = await apiClient.get(`/homework/${homeworkId}`);
        const hwRaw = unwrapResponse<Record<string, unknown>>(hwRes);
        const homework = normalizeHomework(
          hwRaw as Parameters<typeof normalizeHomework>[0],
        );
        const sourceLesson = (hwRaw as {
          sourceLesson?: { id: string; title: string } | null;
        }).sourceLesson ?? null;

        let legacySub: HomeworkSubmission | undefined;
        let structured: StructuredHomeworkSubmission | null = null;
        if (student) {
          const sid = resolveId(student);
          const subRes = await apiClient.get(
            `/homework/student/${sid}/submissions`,
          );
          const subs = unwrapList<StructuredHomeworkSubmission>(subRes, 'submissions');
          structured = subs.find((s) => s.homeworkId === homeworkId) ?? null;
          if (structured) {
            legacySub = normalizeSubmission(
              structured as unknown as Parameters<typeof normalizeSubmission>[0],
            );
          }
        }

        if (cancelled) return;

        const summary = buildItem(
          homework,
          (hwRaw as { subjectId?: unknown }).subjectId,
          legacySub,
          sourceLesson,
        );

        const enriched: StudentHomeworkDetail = {
          ...summary,
          homework,
          description: typeof hwRaw.description === 'string' ? hwRaw.description : undefined,
          quizId: homework.type === 'quiz' ? homework.quizId : undefined,
        };

        setDetail(enriched);
        setSubmission(structured);
      } catch {
        if (!cancelled) {
          setDetail(null);
          setSubmission(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [homeworkId, student, studentLoading]);

  const submitHomework = useCallback(
    async (
      payload: SubmitHomeworkPayload,
    ): Promise<StructuredHomeworkSubmission | null> => {
      try {
        const res = await apiClient.post(`/homework/${homeworkId}/submit`, payload);
        const data = unwrapResponse<StructuredHomeworkSubmission>(res);
        setSubmission(data);
        return data;
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : extractErrorMessage(err, 'Submit failed'),
        );
        return null;
      }
    },
    [homeworkId],
  );

  return {
    detail,
    submission,
    loading: studentLoading || loading,
    submitHomework,
  };
}
