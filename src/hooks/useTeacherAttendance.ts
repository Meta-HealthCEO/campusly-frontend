import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import type { Student, SchoolClass } from '@/types';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendance {
  studentId: string;
  status: AttendanceStatus;
}

export function useTeacherAttendance() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('1');
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsRes, classesRes] = await Promise.allSettled([
          apiClient.get('/students'),
          apiClient.get('/academic/classes'),
        ]);
        if (studentsRes.status === 'fulfilled') {
          const arr = unwrapList<Student>(studentsRes.value);
          if (arr.length > 0) setStudents(arr);
        }
        if (classesRes.status === 'fulfilled') {
          const arr = unwrapList<SchoolClass>(classesRes.value);
          if (arr.length > 0) {
            setClasses(arr);
            setSelectedClass(arr[0]?.id ?? '');
          }
        }
      } catch {
        console.error('Failed to load attendance data');
      }
    }
    fetchData();
  }, []);

  const updateStatus = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      setAttendance((prev) => {
        const filtered = prev.filter((a) => a.studentId !== studentId);
        return [...filtered, { studentId, status }];
      });
      setSaved(false);
    },
    [],
  );

  const changeClass = useCallback((classId: string) => {
    setSelectedClass(classId);
    setSaved(false);
  }, []);

  const changePeriod = useCallback((period: string) => {
    setSelectedPeriod(period);
    setSaved(false);
  }, []);

  const classStudents = students.filter((s) => {
    const cid =
      typeof s.classId === 'object' && s.classId !== null
        ? (s.classId as unknown as { _id?: string; id?: string })._id ??
          (s.classId as unknown as { id?: string }).id
        : s.classId;
    return cid === selectedClass;
  });

  const currentAttendance = classStudents.map((student) => {
    const sid = student.id;
    const existing = attendance.find((a) => a.studentId === sid);
    return {
      studentId: sid,
      status: existing?.status || ('present' as AttendanceStatus),
    };
  });

  const saveAttendance = useCallback(async () => {
    if (!user?.schoolId) {
      toast.error('School information not available');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/attendance/bulk', {
        classId: selectedClass,
        schoolId: user.schoolId,
        date: new Date().toISOString(),
        period: parseInt(selectedPeriod),
        records: currentAttendance.map((a) => ({
          studentId: a.studentId,
          status: a.status,
        })),
      });
      setSaved(true);
      toast.success('Attendance saved successfully!');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save attendance'));
    } finally {
      setSaving(false);
    }
  }, [user?.schoolId, selectedClass, selectedPeriod, currentAttendance]);

  return {
    students,
    classes,
    selectedClass,
    selectedPeriod,
    classStudents,
    currentAttendance,
    saved,
    saving,
    updateStatus,
    changeClass,
    changePeriod,
    saveAttendance,
  };
}

export type { AttendanceStatus, StudentAttendance };
