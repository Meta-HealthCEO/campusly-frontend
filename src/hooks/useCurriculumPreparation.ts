'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, resolveId, unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGrades, useSubjects } from '@/hooks/useAcademics';
import type { CurriculumNodeItem } from '@/types';
import {
  academicSubjectCode,
  extractCurriculumContext,
  findMatchingGrade,
  findMatchingSubject,
  gradeLevel,
  subjectGradeIds,
  type AcademicGradeRecord,
  type AcademicSubjectRecord,
  type CurriculumContextStatus,
  type CurriculumGenerationContext,
} from '@/lib/curriculum-context';

// Pure helpers moved to lib/curriculum-context.ts; re-exported for existing importers.
export * from '@/lib/curriculum-context';

export interface UseCurriculumPreparationResult {
  selectedNode: CurriculumNodeItem | null;
  apply: (node: CurriculumNodeItem | null, ancestors?: CurriculumNodeItem[]) => void;
  curriculumContext: CurriculumGenerationContext | null;
  contextStatus: CurriculumContextStatus;
  contextError: string | null;
  subjectId: string;
  gradeId: string;
  term: number;
  isReady: boolean;
}

export function useCurriculumPreparation(): UseCurriculumPreparationResult {
  const { user } = useAuthStore();
  const { subjects, loading: subjectsLoading, refetch: refetchSubjects } = useSubjects();
  const { grades, loading: gradesLoading, refetch: refetchGrades } = useGrades();

  const [selectedNode, setSelectedNode] = useState<CurriculumNodeItem | null>(null);
  const [curriculumContext, setCurriculumContext] = useState<CurriculumGenerationContext | null>(null);
  const [contextStatus, setContextStatus] = useState<CurriculumContextStatus>('idle');
  const [contextError, setContextError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [term, setTerm] = useState(0);

  const preparedContextKeyRef = useRef<string | null>(null);

  const apply = useCallback((node: CurriculumNodeItem | null, ancestors?: CurriculumNodeItem[]) => {
    setSelectedNode(node);
    preparedContextKeyRef.current = null;

    if (!node) {
      setCurriculumContext(null);
      setContextStatus('idle');
      setContextError(null);
      setSubjectId('');
      setGradeId('');
      setTerm(0);
      return;
    }

    const context = extractCurriculumContext(node, ancestors);
    setCurriculumContext(context);
    setSubjectId('');
    setGradeId('');
    setTerm(context?.term ?? 0);

    if (!context) {
      setContextStatus('error');
      setContextError('Choose a CAPS topic or subtopic that includes a subject, grade, and term.');
      return;
    }

    // Every role — standalone teachers included — now flows through the
    // school-side find-or-create logic below. Standalone teachers used to
    // short-circuit and return CurriculumNode IDs, but the backend now
    // materialises real Subject/Grade rows from their scope, so the cache
    // populated by useSubjects()/useGrades() contains genuine school IDs.
    setContextStatus('preparing');
    setContextError(null);
  }, []);

  useEffect(() => {
    if (!selectedNode || !curriculumContext || !user?.schoolId || subjectsLoading || gradesLoading) {
      return;
    }

    const schoolId = user.schoolId;
    const context = curriculumContext;
    const contextKey = [
      selectedNode.id,
      context.subjectCode,
      context.gradeLevel,
      context.term,
    ].join(':');

    if (preparedContextKeyRef.current === contextKey) return;
    preparedContextKeyRef.current = contextKey;

    let cancelled = false;

    async function prepareAcademicContext() {
      setContextStatus('preparing');
      setContextError(null);

      try {
        let grade = findMatchingGrade(grades, context);

        if (!grade) {
          const response = await apiClient.post('/academic/grades', {
            schoolId,
            name: context.gradeName,
            orderIndex: context.gradeLevel,
          });
          grade = unwrapResponse<AcademicGradeRecord>(response);
        }

        const resolvedGradeId = resolveId(grade);
        if (!resolvedGradeId) {
          throw new Error('Could not prepare the grade for this CAPS topic.');
        }

        let subject = findMatchingSubject(subjects, context);
        const code = academicSubjectCode(context);

        if (!subject) {
          const response = await apiClient.post('/academic/subjects', {
            schoolId,
            name: context.subjectName,
            code,
            gradeIds: [resolvedGradeId],
          });
          subject = unwrapResponse<AcademicSubjectRecord>(response);
        } else {
          const linkedGradeIds = subjectGradeIds(subject);
          if (linkedGradeIds.length === 0 || !linkedGradeIds.includes(resolvedGradeId)) {
            const response = await apiClient.put(`/academic/subjects/${resolveId(subject)}`, {
              schoolId,
              name: subject.name,
              code: subject.code || code,
              gradeIds: [...new Set([...linkedGradeIds, resolvedGradeId])],
            });
            subject = unwrapResponse<AcademicSubjectRecord>(response);
          }
        }

        const resolvedSubjectId = resolveId(subject);
        if (!resolvedSubjectId) {
          throw new Error('Could not prepare the subject for this CAPS topic.');
        }

        if (cancelled) return;
        setGradeId(resolvedGradeId);
        setSubjectId(resolvedSubjectId);
        setTerm(context.term);
        setContextStatus('ready');
        void Promise.all([refetchGrades(), refetchSubjects()]).catch(() => undefined);
      } catch (err: unknown) {
        if (cancelled) return;
        preparedContextKeyRef.current = null;
        setGradeId('');
        setSubjectId('');
        setContextStatus('error');
        setContextError(extractErrorMessage(
          err,
          'Could not prepare this CAPS topic for generation. Please try again.',
        ));
      }
    }

    void prepareAcademicContext();

    return () => {
      cancelled = true;
    };
  }, [
    selectedNode,
    curriculumContext,
    user?.schoolId,
    subjects,
    grades,
    subjectsLoading,
    gradesLoading,
    refetchGrades,
    refetchSubjects,
  ]);

  return {
    selectedNode,
    apply,
    curriculumContext,
    contextStatus,
    contextError,
    subjectId,
    gradeId,
    term,
    isReady: contextStatus === 'ready' && Boolean(subjectId) && Boolean(gradeId) && term > 0,
  };
}
