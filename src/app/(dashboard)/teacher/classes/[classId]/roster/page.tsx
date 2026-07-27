'use client';

import { use, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, ChevronLeft, Download, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ClassroomCodeCard } from '@/components/shared/ClassroomCodeCard';
import { StudentAddDialog } from '@/components/classes/StudentAddDialog';
import { AssignStudentDialog } from '@/components/classes/AssignStudentDialog';
import { InviteStudentDialog } from '@/components/classes/InviteStudentDialog';
import { RegenerateCredentialsDialog } from '@/components/classes/RegenerateCredentialsDialog';
import { RosterStudentRow } from '@/components/classes/RosterStudentRow';
import { getClassDisplayName } from '@/components/classes/class-display';
import { StudentProfileDialog } from '@/components/students/StudentProfileDialog';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import { useAuthStore } from '@/stores/useAuthStore';
import { resolveId, extractErrorMessage } from '@/lib/api-helpers';
import { getStudentDisplayName, isPortalStudent } from '@/lib/student-helpers';
import type { Student } from '@/types';

interface RegenerateTarget {
  id: string;
  name: string;
  email: string;
}

export default function TeacherClassRosterPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const user = useAuthStore((s) => s.user);
  const isStandaloneTeacher = user?.isStandaloneTeacher === true;
  const copyMode = isStandaloneTeacher ? 'teachingGroup' : 'class';
  const learnerLabel = isStandaloneTeacher ? 'Learner' : 'Student';
  const learnerLabelPlural = isStandaloneTeacher ? 'Learners' : 'Students';

  const {
    entries, loading,
    addStudent, removeStudent, inviteStudent, reassignStudent,
  } = useTeacherClasses();

  const entry = useMemo(
    () => entries.find((e) => resolveId(e.class) === classId) ?? null,
    [entries, classId],
  );

  const [studentSearch, setStudentSearch] = useState('');
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
  const [regenStudent, setRegenStudent] = useState<RegenerateTarget | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [showAssignStudent, setShowAssignStudent] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<Student | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const className = entry ? getClassDisplayName(entry) : '';
  const studentCount = entry?.students.length ?? 0;

  const filteredStudents = useMemo(() => {
    if (!entry) return [] as Student[];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return entry.students;
    return entry.students.filter((s: Student) => {
      const { full } = getStudentDisplayName(s);
      return (
        full.toLowerCase().includes(q) ||
        (s.admissionNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [entry, studentSearch]);

  const exportRoster = useCallback(() => {
    if (!entry) return;
    const rows = entry.students.map((s: Student) => {
      const { first, last } = getStudentDisplayName(s);
      return `${first},${last},${s.admissionNumber ?? ''}`;
    });
    const csv = 'First Name,Last Name,Admission Number\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${className}-roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entry, className]);

  const handleAddStudent = useCallback(async (data: Record<string, unknown>) => {
    if (!entry) return;
    const rawGrade = entry.class.gradeId;
    const gradeId = (typeof rawGrade === 'object' && rawGrade !== null
      ? resolveId(rawGrade as { id?: string; _id?: string })
      : (rawGrade as string | undefined))
      ?? resolveId(entry.class.grade);
    if (!classId || !gradeId) {
      throw new Error(isStandaloneTeacher ? 'No teaching group selected' : 'No class selected');
    }
    setAddStudentLoading(true);
    try {
      const email = typeof data.email === 'string' ? data.email.trim() : '';
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
    } finally {
      setAddStudentLoading(false);
    }
  }, [entry, classId, addStudent, isStandaloneTeacher, user]);

  const handleAssignStudent = useCallback(async (studentId: string, targetClassId: string) => {
    try {
      await reassignStudent(studentId, targetClassId);
      toast.success(isStandaloneTeacher ? 'Learner assigned' : 'Student assigned');
      setShowAssignStudent(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, isStandaloneTeacher ? 'Failed to assign learner' : 'Failed to assign student'));
    }
  }, [reassignStudent, isStandaloneTeacher]);

  const handleRemoveStudent = useCallback(async (studentId: string) => {
    try {
      await removeStudent(studentId);
      toast.success(`${learnerLabel} removed`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, `Failed to remove ${learnerLabel.toLowerCase()}`));
    }
  }, [removeStudent, learnerLabel]);

  const handleInviteSubmit = useCallback(async (studentId: string, email: string) => {
    setInvitingId(studentId);
    try {
      const result = await inviteStudent(studentId, email);
      const channel = result.emailSent ? 'Email sent.' : 'Email could not be sent; use the temporary password manually.';
      toast.success(`Portal credentials ready. ${channel} Temporary password: ${result.tempPassword}`);
      return result;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, `Failed to invite ${learnerLabel.toLowerCase()}`));
    } finally {
      setInvitingId(null);
    }
  }, [inviteStudent, learnerLabel]);

  if (loading) {
    return (
      <div className="space-y-6">
        <BackLink />
        <LoadingSpinner />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={Users}
          title={isStandaloneTeacher ? 'Teaching group not found' : 'Class not found'}
          description="It may have been removed, or you no longer have access to it."
        />
      </div>
    );
  }

  const headerDescription = `${studentCount} ${studentCount === 1 ? learnerLabel.toLowerCase() : learnerLabelPlural.toLowerCase()} in this ${isStandaloneTeacher ? 'teaching group' : 'class'}.`;

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader title={className} description={headerDescription}>
        {studentCount > 0 && (
          <Button size="sm" variant="outline" onClick={exportRoster} className="gap-1">
            <Download className="h-4 w-4" /> Export
          </Button>
        )}
      </PageHeader>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Attendance</h3>
            <p className="text-sm text-muted-foreground">
              Take this class&apos;s daily register from the dedicated attendance page.
            </p>
          </div>
          <Link href={`/teacher/attendance?classId=${classId}`}>
            <Button>
              Take attendance
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{learnerLabelPlural}</h2>
            <p className="text-sm text-muted-foreground">
              Manage roster details and portal access for this group.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAddStudent(true)} className="gap-1 shrink-0">
              <Plus className="h-4 w-4" /> Add {learnerLabelPlural}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAssignStudent(true)} className="gap-1 shrink-0">
              <Users className="h-4 w-4" /> Assign Existing
            </Button>
          </div>
        </div>

        {entry.students.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by name or admission number..."
              className="pl-9"
            />
          </div>
        )}

        <div className="space-y-2">
          {entry.students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={`No ${learnerLabelPlural.toLowerCase()} yet`}
              description={
                isStandaloneTeacher
                  ? 'You can still create printable/PDF work. Add learners when you want a register or online portal access.'
                  : 'Add students to this class to get started'
              }
              action={(
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setShowAddStudent(true)} size="sm">Add {learnerLabelPlural}</Button>
                  <Button onClick={() => setShowAssignStudent(true)} size="sm" variant="outline">Assign Existing</Button>
                </div>
              )}
            />
          ) : filteredStudents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No {learnerLabelPlural.toLowerCase()} match &quot;{studentSearch}&quot;.
            </p>
          ) : (
            filteredStudents.map((student: Student, index: number) => (
              <RosterStudentRow
                key={student.id}
                student={student}
                index={index}
                learnerLabel={learnerLabel}
                isPortal={isPortalStudent(student)}
                inviting={invitingId === student.id}
                onEditProfile={setProfileStudentId}
                onInvite={setInviteTarget}
                onRegenerate={setRegenStudent}
                onRemove={handleRemoveStudent}
              />
            ))
          )}
        </div>
      </section>

      <ClassroomCodeCard
        classId={classId}
        className={className}
        copyMode={copyMode}
      />

      <StudentAddDialog
        open={showAddStudent}
        onOpenChange={setShowAddStudent}
        onAddStudent={handleAddStudent}
        isLoading={addStudentLoading}
      />

      <AssignStudentDialog
        open={showAssignStudent}
        onOpenChange={setShowAssignStudent}
        classId={classId}
        currentStudentIds={entry.students.map((s: Student) => s.id)}
        onAssign={handleAssignStudent}
      />

      <InviteStudentDialog
        student={inviteTarget}
        onClose={() => setInviteTarget(null)}
        onInvite={handleInviteSubmit}
        isLoading={invitingId === inviteTarget?.id}
      />

      <StudentProfileDialog
        studentId={profileStudentId}
        onClose={() => setProfileStudentId(null)}
      />

      {regenStudent && (
        <RegenerateCredentialsDialog
          open={Boolean(regenStudent)}
          onOpenChange={(o) => { if (!o) setRegenStudent(null); }}
          studentId={regenStudent.id}
          studentName={regenStudent.name}
          studentEmail={regenStudent.email}
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/teacher/classes"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" /> Back to classes
    </Link>
  );
}
