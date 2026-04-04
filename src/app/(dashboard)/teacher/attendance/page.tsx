'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeacherAttendance } from '@/hooks/useTeacherAttendance';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';
import { CheckCircle2, XCircle, Clock, UserX, Save, Users } from 'lucide-react';
import { useMemo } from 'react';
import type { Student } from '@/types';

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const todayISO = toISODate(new Date());

// ── Status toggle button ─────────────────────────────────────────────────────

interface StatusButtonProps {
  status: AttendanceStatus;
  current: AttendanceStatus;
  onClick: () => void;
}

function StatusButton({ status, current, onClick }: StatusButtonProps) {
  const active = current === status;
  const config: Record<AttendanceStatus, { label: string; icon: React.ReactNode; activeClass: string }> = {
    present: {
      label: 'Present',
      icon: <CheckCircle2 className="h-4 w-4" />,
      activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    absent: {
      label: 'Absent',
      icon: <XCircle className="h-4 w-4" />,
      activeClass: 'bg-destructive/10 text-destructive border-destructive/40',
    },
    late: {
      label: 'Late',
      icon: <Clock className="h-4 w-4" />,
      activeClass: 'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/30 dark:text-amber-400',
    },
  };
  const { label, icon, activeClass } = config[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors min-h-[44px]',
        active ? activeClass : 'border-border text-muted-foreground hover:bg-muted',
      ].join(' ')}
      aria-pressed={active}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Student row ──────────────────────────────────────────────────────────────

interface StudentRowProps {
  student: Student;
  status: AttendanceStatus;
  onUpdate: (studentId: string, status: AttendanceStatus) => void;
}

function getStudentName(student: Student): string {
  const userId = student.userId;
  const first =
    student.user?.firstName ??
    (typeof userId === 'object' && userId !== null
      ? (userId as { firstName?: string }).firstName
      : undefined) ??
    student.firstName ??
    '';
  const last =
    student.user?.lastName ??
    (typeof userId === 'object' && userId !== null
      ? (userId as { lastName?: string }).lastName
      : undefined) ??
    student.lastName ??
    '';
  return `${first} ${last}`.trim() || 'Unknown';
}

function dotClass(status: AttendanceStatus): string {
  if (status === 'present') return 'bg-emerald-500';
  if (status === 'absent') return 'bg-destructive';
  return 'bg-amber-500';
}

function StudentRow({ student, status, onUpdate }: StudentRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotClass(status)}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{getStudentName(student)}</p>
          {student.admissionNumber && (
            <p className="text-xs text-muted-foreground truncate">{student.admissionNumber}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <StatusButton status="present" current={status} onClick={() => onUpdate(student.id, 'present')} />
        <StatusButton status="absent" current={status} onClick={() => onUpdate(student.id, 'absent')} />
        <StatusButton status="late" current={status} onClick={() => onUpdate(student.id, 'late')} />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherAttendancePage() {
  const {
    homeClass,
    students,
    selectedDate,
    attendance,
    saved,
    saving,
    loading,
    changeDate,
    updateStatus,
    markAllPresent,
    saveAttendance,
  } = useTeacherAttendance();

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    students.forEach((s) => {
      const st = attendance.get(s.id) ?? 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else late++;
    });
    return { present, absent, late };
  }, [attendance, students]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Morning Roll Call" description="Mark daily attendance for your home class" />
        <LoadingSpinner />
      </div>
    );
  }

  if (!homeClass) {
    return (
      <div className="space-y-6">
        <PageHeader title="Morning Roll Call" description="Mark daily attendance for your home class" />
        <EmptyState
          icon={UserX}
          title="No Home Class Assigned"
          description="You are not assigned as a class teacher. Contact your administrator."
        />
      </div>
    );
  }

  const classLabel = `${homeClass.grade?.name ?? homeClass.gradeName ?? ''} ${homeClass.name}`.trim();

  return (
    <div className="space-y-4">
      <PageHeader title="Morning Roll Call" description={classLabel} />

      {/* Date picker + stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Date:</span>
          <Input
            type="date"
            value={selectedDate}
            max={todayISO}
            onChange={(e) => { void changeDate(e.target.value); }}
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-sm sm:ml-auto">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">{students.length} students</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">{stats.present} Present</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-destructive font-medium">{stats.absent} Absent</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 font-medium">{stats.late} Late</span>
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Tap a status to mark each student</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="default" onClick={markAllPresent} className="flex-1 sm:flex-none">
            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
            Mark All Present
          </Button>
          <Button
            size="default"
            onClick={() => { void saveAttendance(); }}
            disabled={saving || saved}
            className="flex-1 sm:flex-none"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {/* Student list */}
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Students"
          description="No students are enrolled in this class yet."
        />
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              status={attendance.get(student.id) ?? 'present'}
              onUpdate={updateStatus}
            />
          ))}
        </div>
      )}

      {/* Bottom save button (mobile convenience) */}
      {students.length > 5 && (
        <div className="flex justify-end pt-2 pb-4">
          <Button
            size="default"
            onClick={() => { void saveAttendance(); }}
            disabled={saving || saved}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
}
