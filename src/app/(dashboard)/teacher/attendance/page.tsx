'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StudentRow } from '@/components/attendance/StudentRow';
import { useTeacherAttendance } from '@/hooks/useTeacherAttendance';
import { getStudentDisplayName } from '@/lib/student-helpers';
import { toISODate } from '@/lib/utils';
import { CheckCircle2, UserX, Save, Users, Info, Search } from 'lucide-react';

const todayISO = toISODate(new Date());

export default function TeacherAttendancePage() {
  const {
    homeClass,
    students,
    selectedDate,
    period,
    attendance,
    existingLoaded,
    saved,
    saving,
    loading,
    changeDate,
    setPeriod,
    updateStatus,
    updateNote,
    markAllPresent,
    saveAttendance,
  } = useTeacherAttendance();

  const [search, setSearch] = useState('');

  const isEditing = existingLoaded && !saved;
  const isPastDate = selectedDate < todayISO;

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    students.forEach((s) => {
      const st = attendance.get(s.id)?.status ?? 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else excused++;
    });
    return { present, absent, late, excused };
  }, [attendance, students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = getStudentDisplayName(s).full.toLowerCase();
      return name.includes(q) || (s.admissionNumber ?? '').toLowerCase().includes(q);
    });
  }, [students, search]);

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
  const showFilteredCount = search.trim() !== '' && filteredStudents.length !== students.length;

  return (
    <div className="space-y-4">
      <PageHeader title="Morning Roll Call" description={classLabel} />

      {/* Date picker + stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Period:</span>
            <Select
              value={String(period)}
              onValueChange={(val: unknown) => setPeriod(Number(val as string))}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    Period {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm sm:ml-auto">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">
              {showFilteredCount
                ? `${filteredStudents.length} / ${students.length} students`
                : `${students.length} students`}
            </span>
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
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-blue-700 dark:text-blue-400 font-medium">{stats.excused} Excused</span>
          </span>
        </div>
      </div>

      {/* Editing banner for existing records */}
      {existingLoaded && (
        <Alert className="border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30">
          <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <AlertDescription className="text-sky-800 dark:text-sky-300">
            {isPastDate
              ? `Viewing attendance for ${selectedDate}. You can update individual records.`
              : `Attendance already recorded for today. You can update individual records.`}
          </AlertDescription>
        </Alert>
      )}

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
            {saving ? 'Saving...' : saved ? 'Saved' : isEditing ? 'Update Attendance' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {/* Search filter */}
      {students.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name or admission number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
      )}

      {/* Student list */}
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Students"
          description="No students are enrolled in this class yet."
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Matches"
          description="No students match your search. Try a different query."
        />
      ) : (
        <div className="space-y-2">
          {filteredStudents.map((student) => {
            const entry = attendance.get(student.id);
            return (
              <StudentRow
                key={student.id}
                student={student}
                status={entry?.status ?? 'present'}
                note={entry?.note}
                onUpdate={updateStatus}
                onNoteChange={updateNote}
              />
            );
          })}
        </div>
      )}

      {/* Bottom save button (mobile convenience) */}
      {filteredStudents.length > 5 && (
        <div className="flex justify-end pt-2 pb-4">
          <Button
            size="default"
            onClick={() => { void saveAttendance(); }}
            disabled={saving || saved}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : saved ? 'Saved' : isEditing ? 'Update Attendance' : 'Save Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
}
