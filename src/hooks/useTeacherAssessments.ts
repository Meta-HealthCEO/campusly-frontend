'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { AxiosResponse } from 'axios';

export interface AssessmentLite {
  id: string;
  name: string;
  totalMarks: number;
  term: number;
  classId: string | null;
  subjectId: string;
  subjectName?: string;
}

interface RawAssessment {
  id?: string;
  _id?: string;
  name?: string;
  totalMarks?: number;
  term?: number;
  classId?: string | null;
  subjectId?: string | { id?: string; _id?: string; name?: string };
}

function normaliseSubjectId(value: RawAssessment['subjectId']): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id ?? value._id ?? '';
}

function normaliseSubjectName(value: RawAssessment['subjectId']): string | undefined {
  if (!value || typeof value === 'string') return undefined;
  return value.name;
}

export function useTeacherAssessments(params: {
  classId?: string;
  subjectId?: string;
  enabled?: boolean;
}): {
  assessments: AssessmentLite[];
  loading: boolean;
} {
  const { classId, subjectId, enabled = true } = params;
  const [assessments, setAssessments] = useState<AssessmentLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAssessments([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const query: Record<string, string> = {};
    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;

    apiClient
      .get('/academic/assessments', { params: query })
      .then((res: AxiosResponse) => {
        if (cancelled) return;
        const rows = unwrapList<RawAssessment>(res).map<AssessmentLite>((r) => ({
          id: (r.id ?? r._id) ?? '',
          name: r.name ?? '',
          totalMarks: r.totalMarks ?? 0,
          term: r.term ?? 0,
          classId: r.classId ?? null,
          subjectId: normaliseSubjectId(r.subjectId),
          subjectName: normaliseSubjectName(r.subjectId),
        }));
        setAssessments(rows);
      })
      .catch(() => {
        if (!cancelled) setAssessments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, subjectId, enabled]);

  return { assessments, loading };
}
