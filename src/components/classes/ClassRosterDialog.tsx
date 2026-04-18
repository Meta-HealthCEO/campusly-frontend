'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClassroomCodeCard } from '@/components/shared/ClassroomCodeCard';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, Mail, Users, Download, Trash2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { getStudentDisplayName, isPortalStudent } from '@/lib/student-helpers';
import { resolveId } from '@/lib/api-helpers';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import type { Student } from '@/types';

interface ClassRosterDialogProps {
  entry: TeacherClassEntry | null;
  onClose: () => void;
  onInvite: (student: Student) => void;
  invitingId: string | null;
  onAddStudents: () => void;
  onAssignExisting: () => void;
  onRemoveStudent?: (studentId: string) => void;
}

export function ClassRosterDialog({
  entry,
  onClose,
  onInvite,
  invitingId,
  onAddStudents,
  onAssignExisting,
  onRemoveStudent,
}: ClassRosterDialogProps) {
  const [studentSearch, setStudentSearch] = useState('');

  const classId = entry ? resolveId(entry.class) || null : null;

  const studentCount = entry?.students.length ?? 0;
  const className = entry
    ? `${entry.class.grade?.name ?? ''} ${entry.class.name}`.trim()
    : '';

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

  return (
    <Dialog
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setStudentSearch('');
        }
      }}
    >
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>
              {entry
                ? `${className} — ${studentCount} ${studentCount === 1 ? 'Student' : 'Students'}`
                : 'Student List'}
            </DialogTitle>
            {studentCount > 0 && (
              <Button size="sm" variant="outline" onClick={exportRoster} className="gap-1 shrink-0">
                <Download className="h-4 w-4" /> Export
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4">
          {classId && entry && (
            <ClassroomCodeCard
              classId={classId}
              className={`${entry.class.grade?.name ?? ''} ${entry.class.name}`.trim()}
            />
          )}

          <div className="flex items-center gap-2">
            {(entry?.students.length ?? 0) > 0 && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="pl-9"
                />
              </div>
            )}
            <Button size="sm" variant="outline" onClick={onAddStudents} className="gap-1 shrink-0">
              <Plus className="h-4 w-4" /> Add Students
            </Button>
            <Button size="sm" variant="outline" onClick={onAssignExisting} className="shrink-0">
              Assign Existing
            </Button>
          </div>

          <div className="space-y-2">
            {(entry?.students.length ?? 0) === 0 ? (
              <EmptyState
                icon={Users}
                title="No students yet"
                description="Add students to this class to get started"
                action={<Button onClick={onAddStudents} size="sm">Add Students</Button>}
              />
            ) : filteredStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No students match &quot;{studentSearch}&quot;.
              </p>
            ) : (
              filteredStudents.map((student: Student, index: number) => {
                const { first, last } = getStudentDisplayName(student);
                const portal = isPortalStudent(student);
                return (
                  <div key={student.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(first, last)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{first} {last}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.admissionNumber}</p>
                    </div>
                    {portal ? (
                      <Badge variant="default" className="shrink-0">Portal</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Roster</Badge>
                    )}
                    {!portal && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={invitingId === student.id}
                        onClick={() => onInvite(student)}
                        aria-label="Invite student to portal"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    {onRemoveStudent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveStudent(student.id)}
                        aria-label="Remove student"
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
