import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { StatusButton } from './StatusButton';
import { Input } from '@/components/ui/input';
import { getStudentDisplayName } from '@/lib/student-helpers';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';
import type { Student } from '@/types';

export interface StudentRowProps {
  student: Student;
  status: AttendanceStatus;
  note: string | undefined;
  onUpdate: (studentId: string, status: AttendanceStatus) => void;
  onNoteChange: (studentId: string, note: string) => void;
}

function dotClass(status: AttendanceStatus): string {
  if (status === 'present') return 'bg-emerald-500';
  if (status === 'absent') return 'bg-destructive';
  if (status === 'excused') return 'bg-blue-500';
  return 'bg-amber-500';
}

export function StudentRow({
  student,
  status,
  note,
  onUpdate,
  onNoteChange,
}: StudentRowProps) {
  const name = getStudentDisplayName(student);
  // Expand automatically if there's already a note
  const [noteOpen, setNoteOpen] = useState<boolean>(Boolean(note));
  const hasNote = Boolean(note && note.trim().length > 0);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotClass(status)}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{name.full}</p>
            {student.admissionNumber && (
              <p className="text-xs text-muted-foreground truncate">{student.admissionNumber}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <StatusButton status="present" current={status} onClick={() => onUpdate(student.id, 'present')} />
          <StatusButton status="absent" current={status} onClick={() => onUpdate(student.id, 'absent')} />
          <StatusButton status="late" current={status} onClick={() => onUpdate(student.id, 'late')} />
          <StatusButton status="excused" current={status} onClick={() => onUpdate(student.id, 'excused')} />
          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            aria-pressed={noteOpen}
            aria-label={noteOpen ? 'Hide note' : 'Add note'}
            title={noteOpen ? 'Hide note' : 'Add note'}
            className={[
              'flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors min-h-11 min-w-11',
              hasNote || noteOpen
                ? 'bg-muted text-foreground border-border'
                : 'border-border text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
      {noteOpen && (
        <Input
          type="text"
          placeholder="Add a note (optional)..."
          value={note ?? ''}
          onChange={(e) => onNoteChange(student.id, e.target.value)}
          className="text-xs h-8"
        />
      )}
    </div>
  );
}
