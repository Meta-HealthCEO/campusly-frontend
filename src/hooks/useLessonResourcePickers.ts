'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

// Lightweight pickers used by the lesson workspace drawers (Task 21).
//
// Each hook returns just the fields the picker UI needs — the drawers only
// display title + a short subtitle and submit the selected id back. Detail
// fetching happens elsewhere once the lesson links the resource.

export interface QuizPickerItem {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
}

export interface HomeworkPickerItem {
  id: string;
  title: string;
  subtitle: string;
}

export interface PaperPickerItem {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
}

interface RawQuiz {
  id?: string;
  _id?: string;
  title?: string;
  status?: string;
  subjectId?: { name?: string } | null;
  classId?: { name?: string } | null;
}

interface RawHomework {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  subjectId?: { name?: string } | null;
  classId?: { name?: string } | null;
}

interface RawPaper {
  _id?: string;
  id?: string;
  title?: string;
  status?: string;
  paperType?: string;
  totalMarks?: number;
  subjectId?: { name?: string } | null;
  gradeId?: { name?: string } | null;
}

function pickId(raw: { id?: string; _id?: string }): string {
  return raw.id ?? raw._id ?? '';
}

function joinMeta(parts: Array<string | undefined | null>): string {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(' \u00B7 ');
}

// ── Quizzes ────────────────────────────────────────────────────────────────
export function useQuizzesPicker(): {
  items: QuizPickerItem[];
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<QuizPickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/learning/quizzes');
        const arr = unwrapList<RawQuiz>(res);
        if (cancelled) return;
        setItems(
          arr.map((q) => ({
            id: pickId(q),
            title: q.title ?? 'Untitled quiz',
            subtitle: joinMeta([q.subjectId?.name, q.classId?.name, q.status]) || 'Quiz',
            status: q.status,
          })),
        );
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Failed to load quizzes', err);
          setError('Failed to load quizzes');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}

// ── Homework ───────────────────────────────────────────────────────────────
export function useHomeworkPicker(): {
  items: HomeworkPickerItem[];
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<HomeworkPickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/homework');
        const arr = unwrapList<RawHomework>(res);
        if (cancelled) return;
        setItems(
          arr.map((h) => ({
            id: pickId(h),
            title: h.title ?? 'Untitled homework',
            subtitle:
              joinMeta([h.subjectId?.name, h.classId?.name]) ||
              h.description?.slice(0, 80) ||
              'Homework',
          })),
        );
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Failed to load homework', err);
          setError('Failed to load homework');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}

// ── Papers ─────────────────────────────────────────────────────────────────
export function usePapersPicker(): {
  items: PaperPickerItem[];
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<PaperPickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/question-bank/papers');
        const raw = res.data?.data ?? res.data;
        const arr: RawPaper[] = Array.isArray(raw)
          ? (raw as RawPaper[])
          : ((raw as { papers?: RawPaper[] })?.papers ?? []);
        if (cancelled) return;
        setItems(
          arr.map((p) => ({
            id: pickId(p),
            title: p.title ?? 'Untitled paper',
            subtitle:
              joinMeta([
                p.subjectId?.name,
                p.gradeId?.name,
                p.paperType,
                p.totalMarks ? `${p.totalMarks} marks` : undefined,
                p.status,
              ]) || 'Paper',
            status: p.status,
          })),
        );
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Failed to load papers', err);
          setError('Failed to load papers');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
