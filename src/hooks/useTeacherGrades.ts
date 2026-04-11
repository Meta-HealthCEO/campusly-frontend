import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import {
  unwrapList,
  unwrapResponse,
  extractErrorMessage,
  resolveId,
  resolveField,
} from '@/lib/api-helpers';
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

interface UpdateAssessmentPayload {
  name?: string;
  subjectId?: string;
  type?: Assessment['type'];
  totalMarks?: number;
  weight?: number;
  term?: number;
  date?: string;
}

interface MarkValidationError {
  studentId: string;
  message: string;
}

interface StudentMark {
  id: string;
  assessmentName: string;
  subjectName: string;
  mark: number;
  total: number;
  percentage: number;
  date: string;
}

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
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [studentHistory, setStudentHistory] = useState<StudentMark[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<MarkEntry | null>(null);

  // Load classes
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await apiClient.get('/academic/classes');
        setClasses(unwrapList<SchoolClass>(res));
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

  // Reset when class changes
  useEffect(() => {
    setSelectedSubject('');
    setSelectedAssessment('');
    setSelectedTerm('all');
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
        setAllAssessments(unwrapList<Assessment>(res));
      } catch (err: unknown) {
        console.error('Failed to load assessments', err);
        toast.error('Could not load assessments. Please refresh.');
      }
    }
    fetchAssessments();
    setSelectedAssessment('');
    setMarkEntries([]);
  }, [selectedClass, selectedSubject]);

  // Filtered assessments by term
  const assessments = useMemo(() => {
    if (selectedTerm === 'all') return allAssessments;
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

      const classStudents = students.filter((s) => {
        const cid = resolveId(
          s.classId as string | { id?: string; _id?: string } | undefined,
        );
        return cid === selectedClass;
      });

      setMarkEntries(
        classStudents.map((s) => {
          const id = (s.id as string) ?? '';
          // A student's name may live on either `user` (populated) or
          // `userId` (populated under a different key) or directly on the
          // student root. `resolveField` walks these safely.
          const userObj = s.user ?? s.userId ?? s;
          return {
            studentId: id,
            firstName:
              resolveField<string>(userObj, 'firstName')
              ?? resolveField<string>(s, 'firstName')
              ?? '',
            lastName:
              resolveField<string>(userObj, 'lastName')
              ?? resolveField<string>(s, 'lastName')
              ?? '',
            admissionNumber: (s.admissionNumber as string) ?? '',
            mark:
              existingMarks[id] !== undefined
                ? String(existingMarks[id])
                : '',
            existingMark: existingMarks[id] ?? null,
          };
        }),
      );
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
      const history: StudentMark[] = raw.map((m) => {
        const assessment = m.assessmentId ?? m.assessment;
        const subject = m.subjectId ?? m.subject;
        const mark = (m.mark as number) ?? 0;
        const total = (m.total as number) ?? 0;
        return {
          id: (m.id as string) ?? '',
          assessmentName: resolveField<string>(assessment, 'name') ?? '',
          subjectName: resolveField<string>(subject, 'name') ?? '',
          mark,
          total,
          percentage: total > 0 ? Math.round((mark / total) * 100) : 0,
          date: (m.createdAt as string) ?? '',
        };
      });
      setStudentHistory(history);
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

export type {
  MarkEntry,
  ClassStats,
  CreateAssessmentPayload,
  UpdateAssessmentPayload,
  MarkValidationError,
  StudentMark,
};
