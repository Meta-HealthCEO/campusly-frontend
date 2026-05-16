import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { resolveId, extractErrorMessage } from '@/lib/api-helpers';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import { useGrades } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PopulatedId } from '@/types';

/**
 * `entry.class.gradeId` is typed `string` but the backend often populates it
 * as `{ _id, name, level }`. Combined with the populated `entry.class.grade`
 * fallback, this returns whichever id is available — always a string.
 */
function gradeIdOf(entry: TeacherClassEntry): string {
  return (
    resolveId(entry.class.gradeId as unknown as PopulatedId) ||
    resolveId(entry.class.grade as unknown as PopulatedId)
  );
}

function entryKey(entry: TeacherClassEntry): string {
  const clsId = resolveId(entry.class) || Math.random().toString(36).slice(2);
  const subjId = entry.subject?.id ?? (entry.isHomeroom ? 'homeroom' : 'none');
  return `${clsId}::${subjId}`;
}

export { entryKey };

export function useClassesPageState() {
  const user = useAuthStore((s) => s.user);
  const {
    entries, students: allStudents, loading, createClass, updateClass,
    deleteClass, addStudent,
  } = useTeacherClasses();
  const { grades } = useGrades();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<TeacherClassEntry | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const distinctSubjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.subject) map.set(e.subject.id, e.subject.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e: TeacherClassEntry) =>
        e.class.name.toLowerCase().includes(q) ||
        (e.class.grade?.name ?? e.class.gradeName ?? '').toLowerCase().includes(q) ||
        (e.subject?.name ?? '').toLowerCase().includes(q),
      );
    }
    if (filterGrade !== 'all') {
      result = result.filter((e: TeacherClassEntry) => gradeIdOf(e) === filterGrade);
    }
    if (filterSubject !== 'all') {
      if (filterSubject === 'homeroom') {
        result = result.filter((e: TeacherClassEntry) => e.isHomeroom);
      } else {
        result = result.filter((e: TeacherClassEntry) => e.subject?.id === filterSubject);
      }
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case 'name-desc': return b.class.name.localeCompare(a.class.name);
        case 'students-desc': return (b.students?.length ?? 0) - (a.students?.length ?? 0);
        case 'students-asc': return (a.students?.length ?? 0) - (b.students?.length ?? 0);
        default: return a.class.name.localeCompare(b.class.name);
      }
    });
  }, [entries, search, sort, filterGrade, filterSubject]);

  const isStandaloneTeacher = user?.isStandaloneTeacher === true;
  const description = isStandaloneTeacher
    ? `${entries.length} ${entries.length === 1 ? 'teaching group' : 'teaching groups'} - ${allStudents.length} ${allStudents.length === 1 ? 'learner' : 'learners'} added`
    : `${entries.length} ${entries.length === 1 ? 'class' : 'classes'} - ${allStudents.length} ${allStudents.length === 1 ? 'student' : 'students'}`;

  const handleCreateClass = useCallback(async (data: { name: string; gradeId: string; capacity: number; subjectId?: string | null; isHomeroom?: boolean }) => {
    setCreateLoading(true);
    try {
      await createClass({ ...data, schoolId: user!.schoolId, teacherId: user!.id });
      toast.success(isStandaloneTeacher ? 'Teaching group created' : 'Class created');
      setShowCreateDialog(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, isStandaloneTeacher ? 'Failed to create teaching group' : 'Failed to create class'));
    } finally { setCreateLoading(false); }
  }, [createClass, isStandaloneTeacher, user]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteClass(deleteTarget);
      toast.success(isStandaloneTeacher ? 'Teaching group deleted' : 'Class deleted');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(extractErrorMessage(err, isStandaloneTeacher ? 'Cannot delete teaching group with learners' : 'Cannot delete class with students'));
      } else {
        toast.error(extractErrorMessage(err, isStandaloneTeacher ? 'Failed to delete teaching group' : 'Failed to delete class'));
      }
    }
  }, [deleteTarget, deleteClass, isStandaloneTeacher]);

  const handleAddStudent = useCallback(async (
    data: Record<string, unknown>,
    targetEntry: TeacherClassEntry | null,
  ) => {
    if (!targetEntry) return;
    const classId = resolveId(targetEntry.class);
    const rawGrade = targetEntry.class.gradeId;
    const gradeId = (typeof rawGrade === 'object' && rawGrade !== null
      ? resolveId(rawGrade as { id?: string; _id?: string })
      : (rawGrade as string | undefined))
      ?? resolveId(targetEntry.class.grade);
    if (!classId || !gradeId) throw new Error(isStandaloneTeacher ? 'No teaching group selected' : 'No class selected');
    setAddStudentLoading(true);
    try {
      const email = typeof data.email === 'string' ? data.email.trim() : '';
      // Dialog passes deliveryMethod explicitly (D2). Fall back to the
      // email-presence heuristic for any callers that haven't been updated.
      const explicitMethod = data.deliveryMethod;
      const deliveryMethod: 'email' | 'slip' = explicitMethod === 'email' || explicitMethod === 'slip'
        ? explicitMethod
        : email ? 'email' : 'slip';
      return await addStudent({
        ...data,
        classId,
        gradeId,
        schoolId: user!.schoolId,
        deliveryMethod,
      });
    } finally { setAddStudentLoading(false); }
  }, [addStudent, isStandaloneTeacher, user]);

  const handleEditClass = useCallback(async (data: { name: string; gradeId: string; capacity: number; subjectId?: string | null; isHomeroom?: boolean }) => {
    if (!editEntry) return;
    setEditLoading(true);
    try {
      const clsId = resolveId(editEntry.class);
      await updateClass(clsId, { ...data, schoolId: user!.schoolId, teacherId: user!.id });
      toast.success(isStandaloneTeacher ? 'Teaching group updated' : 'Class updated');
      setEditEntry(null);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, isStandaloneTeacher ? 'Failed to update teaching group' : 'Failed to update class'));
    } finally { setEditLoading(false); }
  }, [editEntry, updateClass, isStandaloneTeacher, user]);

  return {
    // Data
    entries, allStudents, loading, grades, description,
    distinctSubjects, filteredEntries,
    // UI state
    showCreateDialog, setShowCreateDialog,
    createLoading,
    showAddStudent, setShowAddStudent,
    addStudentLoading,
    deleteTarget, setDeleteTarget,
    editEntry, setEditEntry,
    editLoading,
    search, setSearch,
    sort, setSort,
    filterGrade, setFilterGrade,
    filterSubject, setFilterSubject,
    // Handlers
    handleCreateClass, handleDelete, handleAddStudent,
    handleEditClass,
    // Helpers
    entryKey,
  };
}
