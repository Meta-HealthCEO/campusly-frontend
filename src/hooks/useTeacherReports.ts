import { useMemo, useState } from 'react';
import { resolveField, resolveId } from '@/lib/api-helpers';
import type { SchoolClass, Student } from '@/types';
import { useTeacherClasses } from './useTeacherClasses';

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

interface StudentOption {
  id: string;
  name: string;
  admissionNumber: string;
  classId: string;
}

function getClassLabel(classInfo: SchoolClass): string {
  const gradeName =
    resolveField<string>(classInfo.gradeId, 'name') ??
    resolveField<string>(classInfo.grade, 'name') ??
    classInfo.gradeName ??
    '';
  return [gradeName, classInfo.name].filter(Boolean).join(' ') || 'Class';
}

function getStudentName(student: Student): string {
  const fallbackUser = typeof (student.userId as unknown) === 'object' && student.userId !== null
    ? (student.userId as unknown as Record<string, unknown>)
    : undefined;
  const populatedUser = student.user ?? fallbackUser;
  const firstName = student.firstName ?? resolveField<string>(populatedUser, 'firstName') ?? '';
  const lastName = student.lastName ?? resolveField<string>(populatedUser, 'lastName') ?? '';
  return `${firstName} ${lastName}`.trim() || student.admissionNumber || 'Unknown student';
}

export function useTeacherReportData() {
  const { entries, loading } = useTeacherClasses();
  const [selectedClassOverride, setSelectedClass] = useState('');

  const classes = useMemo<ClassOption[]>(() => {
    const byClass = new Map<string, { classInfo: SchoolClass; studentIds: Set<string> }>();

    for (const entry of entries) {
      const classId = resolveId(entry.class);
      if (!classId) continue;

      if (!byClass.has(classId)) {
        byClass.set(classId, { classInfo: entry.class, studentIds: new Set<string>() });
      }

      const bucket = byClass.get(classId)!;
      for (const student of entry.students) {
        const studentId = resolveId(student);
        if (studentId) bucket.studentIds.add(studentId);
      }
    }

    return [...byClass.entries()]
      .map(([id, value]) => ({
        id,
        name: getClassLabel(value.classInfo),
        studentCount: value.studentIds.size,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const selectedClass = useMemo(() => {
    if (classes.length === 0) return '';
    if (selectedClassOverride && classes.some((classInfo) => classInfo.id === selectedClassOverride)) {
      return selectedClassOverride;
    }
    return classes[0].id;
  }, [classes, selectedClassOverride]);

  const students = useMemo<StudentOption[]>(() => {
    if (!selectedClass) return [];

    const byStudent = new Map<string, StudentOption>();
    for (const entry of entries) {
      const classId = resolveId(entry.class);
      if (classId !== selectedClass) continue;

      for (const student of entry.students) {
        const id = resolveId(student);
        if (!id || byStudent.has(id)) continue;
        byStudent.set(id, {
          id,
          classId,
          name: getStudentName(student),
          admissionNumber: student.admissionNumber ?? '',
        });
      }
    }

    return [...byStudent.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, selectedClass]);

  return {
    classes,
    students,
    selectedClass,
    setSelectedClass,
    loadingStudents: loading,
    loadingClasses: loading,
  };
}

export type { ClassOption, StudentOption };
