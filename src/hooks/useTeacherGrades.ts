import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SchoolClass, Assessment } from '@/types';

interface MarkEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  mark: string;
  existingMark: number | null;
}

export function useTeacherGrades() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [markEntries, setMarkEntries] = useState<MarkEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
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

  // Load assessments when class changes
  useEffect(() => {
    if (!selectedClass) {
      setAssessments([]);
      return;
    }
    async function fetchAssessments() {
      try {
        const res = await apiClient.get('/academic/assessments', {
          params: { classId: selectedClass },
        });
        setAssessments(unwrapList<Assessment>(res));
      } catch {
        console.error('Failed to load assessments');
      }
    }
    fetchAssessments();
    setSelectedAssessment('');
    setMarkEntries([]);
  }, [selectedClass]);

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
  }, [currentAssessment, markEntries, selectedAssessment, schoolId, loadMarks]);

  return {
    classes,
    assessments,
    markEntries,
    selectedClass,
    selectedAssessment,
    loading,
    saving,
    currentAssessment,
    setSelectedClass,
    setSelectedAssessment,
    handleMarkChange,
    saveMarks,
  };
}

export type { MarkEntry };
