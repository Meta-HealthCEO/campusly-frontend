import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import {
  unwrapList,
  unwrapResponse,
  extractErrorMessage,
  resolveId,
} from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  buildMarkEntries,
  computeClassStats,
  mapStudentHistory,
  validateMarkEntries,
  type ClassStats,
  type CreateAssessmentPayload,
  type MarkEntry,
  type MarkValidationError,
  type StudentMark,
  type UpdateAssessmentPayload,
} from '@/lib/gradebook-helpers';
import type { SchoolClass, Assessment, Subject } from '@/types';

export function useTeacherGrades() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [markEntries, setMarkEntries] = useState<MarkEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('year');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [studentHistory, setStudentHistory] = useState<StudentMark[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<MarkEntry | null>(null);

  // Load classes — auto-select the first one so the gradebook lands on
  // something useful instead of a blank "Select class" prompt.
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await apiClient.get('/academic/classes');
        const list = unwrapList<SchoolClass>(res);
        setClasses(list);
        if (list.length > 0) {
          setSelectedClass((prev) => prev || list[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to load classes', err);
        toast.error('Could not load classes. Please refresh.');
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
      } catch (err: unknown) {
        console.error('Failed to load subjects', err);
        toast.error('Could not load subjects. Please refresh.');
      }
    }
    fetchSubjects();
  }, []);

  // Reset assessment-scoped state when class changes — but keep the term
  // picker as-is so the teacher's chosen term carries across class switches.
  useEffect(() => {
    setSelectedSubject('');
    setSelectedAssessment('');
    setAllAssessments([]);
    setMarkEntries([]);
  }, [selectedClass]);

  // Load assessments when class or subject changes
  useEffect(() => {
    if (!selectedClass) {
      setAllAssessments([]);
      return;
    }
    async function fetchAssessments() {
      try {
        const params: Record<string, string> = { classId: selectedClass };
        if (selectedSubject) params.subjectId = selectedSubject;
        const res = await apiClient.get('/academic/assessments', { params });
        const list = unwrapList<Assessment>(res);
        setAllAssessments(list);
        // Auto-select the most recently created assessment so a fresh publish
        // is immediately visible. Backend default sort is `-createdAt`.
        if (list.length > 0) {
          setSelectedAssessment((prev) => prev || list[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to load assessments', err);
        toast.error('Could not load assessments. Please refresh.');
      }
    }
    fetchAssessments();
    setSelectedAssessment('');
    setMarkEntries([]);
  }, [selectedClass, selectedSubject]);

  // Filtered assessments by term; 'year' shows every assessment.
  const assessments = useMemo(() => {
    if (selectedTerm === 'year') return allAssessments;
    return allAssessments.filter((a) => String(a.term) === selectedTerm);
  }, [allAssessments, selectedTerm]);

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
          const sid = resolveId(
            m.studentId as string | { id?: string; _id?: string } | undefined,
          );
          if (sid) existingMarks[sid] = m.mark as number;
        }
      }

      setMarkEntries(buildMarkEntries(students, existingMarks, selectedClass));
      // Reset dirty state whenever a fresh snapshot loads.
      setIsDirty(false);
    } catch (err: unknown) {
      console.error('Failed to load marks', err);
      toast.error('Could not load marks. Please refresh.');
    }
  }, [selectedClass, selectedAssessment]);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  const currentAssessment = assessments.find((a) => a.id === selectedAssessment)
    ?? allAssessments.find((a) => a.id === selectedAssessment);

  // Mark validation
  const markValidationErrors = useMemo((): MarkValidationError[] => {
    if (!currentAssessment) return [];
    return validateMarkEntries(markEntries, currentAssessment.totalMarks);
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
    if (!currentAssessment) return null;
    return computeClassStats(markEntries, currentAssessment.totalMarks);
  }, [markEntries, currentAssessment]);

  const handleMarkChange = useCallback(
    (studentId: string, value: string) => {
      setMarkEntries((prev) =>
        prev.map((e) =>
          e.studentId === studentId ? { ...e, mark: value } : e,
        ),
      );
      setIsDirty(true);
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
      setIsDirty(false);
      loadMarks();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save marks'));
    } finally {
      setSaving(false);
    }
  }, [currentAssessment, markEntries, selectedAssessment, schoolId, loadMarks, hasValidationErrors]);

  const refreshAssessments = useCallback(async (classId: string, subjectId: string) => {
    const params: Record<string, string> = { classId };
    if (subjectId) params.subjectId = subjectId;
    const refreshRes = await apiClient.get('/academic/assessments', { params });
    setAllAssessments(unwrapList<Assessment>(refreshRes));
  }, []);

  const createAssessment = useCallback(async (payload: CreateAssessmentPayload) => {
    try {
      const res = await apiClient.post('/academic/assessments', {
        ...payload,
        schoolId,
        academicYear: new Date().getFullYear(),
      });
      const created = unwrapResponse<Assessment>(res);
      toast.success('Assessment created successfully');
      await refreshAssessments(payload.classId, payload.subjectId);
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create assessment'));
      throw err;
    }
  }, [schoolId, refreshAssessments]);

  const updateAssessment = useCallback(async (id: string, payload: UpdateAssessmentPayload) => {
    try {
      const res = await apiClient.put(`/academic/assessments/${id}`, payload);
      const updated = unwrapResponse<Assessment>(res);
      toast.success('Assessment updated successfully');
      await refreshAssessments(selectedClass, selectedSubject);
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update assessment'));
      throw err;
    }
  }, [selectedClass, selectedSubject, refreshAssessments]);

  const deleteAssessment = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/academic/assessments/${id}`);
      toast.success('Assessment deleted');
      setAllAssessments((prev) => prev.filter((a) => a.id !== id));
      if (selectedAssessment === id) {
        setSelectedAssessment('');
        setMarkEntries([]);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete assessment'));
      throw err;
    }
  }, [selectedAssessment]);

  const fetchStudentHistory = useCallback(async (studentId: string) => {
    try {
      const res = await apiClient.get(`/academic/marks/student/${studentId}`);
      const raw = unwrapList<Record<string, unknown>>(res);
      setStudentHistory(mapStudentHistory(raw));
    } catch (err: unknown) {
      console.error('Failed to load student history', err);
      toast.error('Could not load student history.');
      setStudentHistory([]);
    }
  }, []);

  return {
    classes,
    subjects,
    assessments,
    allAssessments,
    markEntries,
    selectedClass,
    selectedSubject,
    selectedAssessment,
    selectedTerm,
    loading,
    saving,
    isDirty,
    currentAssessment,
    classStats,
    hasValidationErrors,
    getMarkError,
    studentHistory,
    selectedStudent,
    setSelectedClass,
    setSelectedSubject,
    setSelectedAssessment,
    setSelectedTerm,
    setSelectedStudent,
    handleMarkChange,
    saveMarks,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    fetchStudentHistory,
    loadMarks,
  };
}

// Re-export the gradebook model types for existing importers.
export type {
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
  MarkEntry,
  ClassStats,
  MarkValidationError,
  StudentMark,
} from '@/lib/gradebook-helpers';
