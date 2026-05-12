import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { resolveId, extractErrorMessage } from '@/lib/api-helpers';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import { useGrades } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student } from '@/types';

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
    deleteClass, addStudent, removeStudent, inviteStudent, reassignStudent,
  } = useTeacherClasses();
  const { grades } = useGrades();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<Student | null>(null);
  const [showAssignStudent, setShowAssignStudent] = useState(false);
  const [editEntry, setEditEntry] = useState<TeacherClassEntry | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const selectedEntry = useMemo(
    () => (selectedKey ? entries.find((e: TeacherClassEntry) => entryKey(e) === selectedKey) ?? null : null),
    [selectedKey, entries],
  );

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
      result = result.filter((e: TeacherClassEntry) => {
        const gradeId = resolveId(e.class.grade) || e.class.gradeId;
        return gradeId === filterGrade;
      });
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

  const handleCreateClass = useCallback(async (data: { name: string; gradeId: string; capacity: number; subjectId?: string; isHomeroom?: boolean }) => {
    setCreateLoading(true);
    try {
      await createClass({ ...data, schoolId: user!.schoolId, teacherId: user!.id });
      toast.success(isStandaloneTeacher ? 'Teaching group created' : 'Class created');
      setShowCreateDialog(false);
    } catch (err: unknown) {
      console.error('Failed to create class', err);
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

  const handleAddStudent = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedEntry) return;
    const classId = resolveId(selectedEntry.class);
    const rawGrade = selectedEntry.class.gradeId;
    const gradeId = (typeof rawGrade === 'object' && rawGrade !== null
      ? resolveId(rawGrade as { id?: string; _id?: string })
      : (rawGrade as string | undefined))
      ?? resolveId(selectedEntry.class.grade);
    if (!classId || !gradeId) throw new Error(isStandaloneTeacher ? 'No teaching group selected' : 'No class selected');
    setAddStudentLoading(true);
    try {
      await addStudent({ ...data, classId, gradeId, schoolId: user!.schoolId });
    } catch (err: unknown) {
      console.error('Failed to add student', err);
      toast.error(extractErrorMessage(err, 'Failed to add student'));
      throw err; // let dialog show its own error / not close
    } finally { setAddStudentLoading(false); }
  }, [selectedEntry, addStudent, isStandaloneTeacher, user]);

  const handleEditClass = useCallback(async (data: { name: string; gradeId: string; capacity: number; subjectId?: string; isHomeroom?: boolean }) => {
    if (!editEntry) return;
    setEditLoading(true);
    try {
      const clsId = resolveId(editEntry.class);
      await updateClass(clsId, { ...data, schoolId: user!.schoolId, teacherId: user!.id });
      toast.success(isStandaloneTeacher ? 'Teaching group updated' : 'Class updated');
      setEditEntry(null);
    } catch (err: unknown) {
      console.error('Failed to update class', err);
      toast.error(extractErrorMessage(err, isStandaloneTeacher ? 'Failed to update teaching group' : 'Failed to update class'));
    } finally { setEditLoading(false); }
  }, [editEntry, updateClass, isStandaloneTeacher, user]);

  const handleRemoveStudent = useCallback(async (studentId: string) => {
    try {
      await removeStudent(studentId);
      toast.success('Student removed');
    } catch (err: unknown) {
      console.error('Failed to remove student', err);
      toast.error(extractErrorMessage(err, 'Failed to remove student'));
    }
  }, [removeStudent]);

  const handleInviteSubmit = useCallback(async (studentId: string, email: string) => {
    setInvitingId(studentId);
    try {
      const result = await inviteStudent(studentId, email);
      toast.success(`Invited! Temporary password: ${result.tempPassword}`);
      setInviteTarget(null);
    } catch (err: unknown) {
      console.error('Failed to invite student', err);
      toast.error(extractErrorMessage(err, 'Failed to invite student'));
    } finally { setInvitingId(null); }
  }, [inviteStudent]);

  const handleAssignStudent = useCallback(async (studentId: string, classId: string) => {
    try {
      await reassignStudent(studentId, classId);
      toast.success(isStandaloneTeacher ? 'Learner assigned' : 'Student assigned');
      setShowAssignStudent(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, isStandaloneTeacher ? 'Failed to assign learner' : 'Failed to assign student'));
    }
  }, [isStandaloneTeacher, reassignStudent]);

  return {
    // Data
    entries, allStudents, loading, grades, description,
    selectedEntry, distinctSubjects, filteredEntries,
    // UI state
    showCreateDialog, setShowCreateDialog,
    createLoading,
    selectedKey, setSelectedKey,
    showAddStudent, setShowAddStudent,
    addStudentLoading,
    deleteTarget, setDeleteTarget,
    invitingId,
    inviteTarget, setInviteTarget,
    showAssignStudent, setShowAssignStudent,
    editEntry, setEditEntry,
    editLoading,
    search, setSearch,
    sort, setSort,
    filterGrade, setFilterGrade,
    filterSubject, setFilterSubject,
    // Handlers
    handleCreateClass, handleDelete, handleAddStudent,
    handleEditClass, handleRemoveStudent, handleInviteSubmit,
    handleAssignStudent,
    // Helpers
    entryKey,
  };
}
