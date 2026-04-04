import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SchoolClass, Assessment, Subject } from '@/types';

interface MarkEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  mark: string;
  existingMark: number | null;
}

interface ClassStats {
  average: number;
  highest: number;
  lowest: number;
  passCount: number;
  totalWithMarks: number;
}

interface CreateAssessmentPayload {
  name: string;
  subjectId: string;
  classId: string;
  type: Assessment['type'];
  totalMarks: number;
  weight: number;
  term: number;
  date: string;
}

interface MarkValidationError {
  studentId: string;
  message: string;
}

export function useTeacherGrades() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [markEntries, setMarkEntries] = useState<MarkEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load classes
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await apiClient.get('/academic/classes');
        setClasses(unwrapList<SchoolClass>(res));
      } catch {
        console.error('Failed to load classes');
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, []);

  // Load subjects
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await apiClient.get('/academic/subjects');
        setSubjects(unwrapList<Subject>(res));
      } catch {
        console.error('Failed to load subjects');
      }
    }
    fetchSubjects();
  }, []);

  // Reset subject and assessment when class changes
  useEffect(() => {
    setSelectedSubject('');
    setSelectedAssessment('');
    setAssessments([]);
    setMarkEntries([]);
  }, [selectedClass]);

  // Load assessments when class or subject changes
  useEffect(() => {
    if (!selectedClass) {
      setAssessments([]);
      return;
    }
    async function fetchAssessments() {
      try {
        const params: Record<string, string> = { classId: selectedClass };
        if (selectedSubject) params.subjectId = selectedSubject;
        const res = await apiClient.get('/academic/assessments', { params });
        setAssessments(unwrapList<Assessment>(res));
      } catch {
        console.error('Failed to load assessments');
      }
    }
    fetchAssessments();
    setSelectedAssessment('');
    setMarkEntries([]);
  }, [selectedClass, selectedSubject]);

  // Load students + existing marks when assessment changes
  const loadMarks = useCallback(async () => {
    if (!selectedClass || !selectedAssessment) {
      setMarkEntries([]);
      return;
    }
    try {
      const [studentsRes, marksRes] = await Promise.allSettled([
        apiClient.get('/students', { params: { classId: selectedClass } }),
        apiClient.get(`/academic/marks/assessment/${selectedAssessment}`),
      ]);

      let students: Record<string, unknown>[] = [];
      if (studentsRes.status === 'fulfilled') {
        students = unwrapList<Record<string, unknown>>(studentsRes.value);
      }

      const existingMarks: Record<string, number> = {};
      if (marksRes.status === 'fulfilled') {
        const marksArr = unwrapList<Record<string, unknown>>(marksRes.value);
        for (const m of marksArr) {
          const sid =
            typeof m.studentId === 'object'
              ? ((m.studentId as Record<string, unknown>)?.id as string) ??
                ((m.studentId as Record<string, unknown>)?._id as string) ??
                ''
              : (m.studentId as string) ?? '';
          if (sid) existingMarks[sid] = m.mark as number;
        }
      }

      // Filter students by classId
      const classStudents = students.filter((s) => {
        const cid =
          typeof s.classId === 'object'
            ? ((s.classId as Record<string, unknown>)?.id as string) ??
              ((s.classId as Record<string, unknown>)?._id as string) ??
              ''
            : (s.classId as string) ?? '';
        return cid === selectedClass;
      });

      setMarkEntries(
        classStudents.map((s) => {
          const id = (s.id as string) ?? '';
          const u = (s.user ?? s.userId ?? s) as Record<string, unknown>;
          return {
            studentId: id,
            firstName: (u.firstName as string) ?? (s.firstName as string) ?? '',
            lastName: (u.lastName as string) ?? (s.lastName as string) ?? '',
            admissionNumber: (s.admissionNumber as string) ?? '',
            mark:
              existingMarks[id] !== undefined
                ? String(existingMarks[id])
                : '',
            existingMark: existingMarks[id] ?? null,
          };
        }),
      );
    } catch {
      console.error('Failed to load marks');
    }
  }, [selectedClass, selectedAssessment]);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  const currentAssessment = assessments.find(
    (a) => a.id === selectedAssessment,
  );

  // Mark validation
  const markValidationErrors = useMemo((): MarkValidationError[] => {
    if (!currentAssessment) return [];
    const errors: MarkValidationError[] = [];
    for (const entry of markEntries) {
      if (entry.mark === '') continue;
      const num = Number(entry.mark);
      if (isNaN(num)) {
        errors.push({ studentId: entry.studentId, message: 'Must be a number' });
      } else if (num < 0) {
        errors.push({ studentId: entry.studentId, message: 'Cannot be negative' });
      } else if (num > currentAssessment.totalMarks) {
        errors.push({
          studentId: entry.studentId,
          message: `Exceeds total (${currentAssessment.totalMarks})`,
        });
      }
    }
    return errors;
  }, [markEntries, currentAssessment]);

  const hasValidationErrors = markValidationErrors.length > 0;

  const getMarkError = useCallback(
    (studentId: string): string | undefined => {
      return markValidationErrors.find((e) => e.studentId === studentId)?.message;
    },
    [markValidationErrors],
  );

  // Class stats
  const classStats = useMemo((): ClassStats | null => {
    if (!currentAssessment || markEntries.length === 0) return null;
    const validMarks = markEntries
      .filter((e) => e.mark !== '')
      .map((e) => Number(e.mark))
      .filter((n) => !isNaN(n));

    if (validMarks.length === 0) return null;

    const total = currentAssessment.totalMarks;
    const percentages = validMarks.map((m) => (m / total) * 100);
    const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

    return {
      average: Math.round(avg * 10) / 10,
      highest: Math.max(...validMarks),
      lowest: Math.min(...validMarks),
      passCount: percentages.filter((p) => p >= 50).length,
      totalWithMarks: validMarks.length,
    };
  }, [markEntries, currentAssessment]);

  const handleMarkChange = useCallback(
    (studentId: string, value: string) => {
      setMarkEntries((prev) =>
        prev.map((e) =>
          e.studentId === studentId ? { ...e, mark: value } : e,
        ),
      );
    },
    [],
  );

  const saveMarks = useCallback(async () => {
    if (!currentAssessment) return;

    if (hasValidationErrors) {
      toast.error('Fix validation errors before saving');
      return;
    }

    const marks = markEntries
      .filter((e) => e.mark !== '')
      .map((e) => ({
        studentId: e.studentId,
        mark: Number(e.mark),
        total: currentAssessment.totalMarks,
      }));

    if (marks.length === 0) {
      toast.error('No marks to save');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/academic/marks/bulk-capture', {
        assessmentId: selectedAssessment,
        schoolId,
        marks,
      });
      toast.success('Marks saved successfully');
      loadMarks();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save marks'));
    } finally {
      setSaving(false);
    }
  }, [currentAssessment, markEntries, selectedAssessment, schoolId, loadMarks, hasValidationErrors]);

  const createAssessment = useCallback(async (payload: CreateAssessmentPayload) => {
    try {
      const res = await apiClient.post('/academic/assessments', {
        ...payload,
        schoolId,
        academicYear: new Date().getFullYear(),
      });
      const created = unwrapResponse<Assessment>(res);
      toast.success('Assessment created successfully');
      // Refresh assessments list
      const params: Record<string, string> = { classId: payload.classId };
      if (payload.subjectId) params.subjectId = payload.subjectId;
      const refreshRes = await apiClient.get('/academic/assessments', { params });
      setAssessments(unwrapList<Assessment>(refreshRes));
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create assessment'));
      throw err;
    }
  }, [schoolId]);

  return {
    classes,
    subjects,
    assessments,
    markEntries,
    selectedClass,
    selectedSubject,
    selectedAssessment,
    loading,
    saving,
    currentAssessment,
    classStats,
    hasValidationErrors,
    getMarkError,
    setSelectedClass,
    setSelectedSubject,
    setSelectedAssessment,
    handleMarkChange,
    saveMarks,
    createAssessment,
  };
}

export type { MarkEntry, ClassStats, CreateAssessmentPayload, MarkValidationError };
