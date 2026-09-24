import { useState } from 'react';
import { MessageSquare, History } from 'lucide-react';
import { StatusButton } from './StatusButton';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getStudentDisplayName } from '@/lib/student-helpers';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';
import type { AttendanceEditHistoryEntry } from '@/types/attendance';
import type { Student } from '@/types';
import { LearnerLink } from '@/components/students/LearnerLink';
import { LogBehaviourButton } from '@/components/behaviour/LogBehaviourButton';

export interface StudentRowProps {
  student: Student;
  status: AttendanceStatus;
  note: string | undefined;
  editHistory?: AttendanceEditHistoryEntry[];
  onUpdate: (studentId: string, status: AttendanceStatus) => void;
  onNoteChange: (studentId: string, note: string) => void;
  /** Link the name to the learner's profile; off while there are unsaved marks, so leaving can't lose them. */
  linkName?: boolean;
  /** Offer "Log behaviour" beside the name (the register; logging doesn't leave the page). */
  logBehaviour?: boolean;
}

function dotClass(status: AttendanceStatus): string {
  if (status === 'present') return 'bg-success';
  if (status === 'absent') return 'bg-destructive';
  if (status === 'excused') return 'bg-info';
  return 'bg-attention';
}

export function StudentRow({
  student,
  status,
  note,
  editHistory,
  onUpdate,
  onNoteChange,
  linkName = true,
  logBehaviour = false,
}: StudentRowProps) {
  const name = getStudentDisplayName(student);
  const [noteOpen, setNoteOpen] = useState<boolean>(Boolean(note));
  const hasNote = Boolean(note && note.trim().length > 0);
  const hasHistory = (editHistory?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotClass(status)}`} />
          <div className="min-w-0 flex items-center gap-1">
            {linkName
              ? <LearnerLink studentId={student.id} name={name.full} className="text-sm font-medium truncate" />
              : <p className="text-sm font-medium truncate">{name.full}</p>}
            {logBehaviour ? <LogBehaviourButton learner={{ id: student.id, name: name.full }} source="register" /> : null}
            {hasHistory && editHistory && (
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="ml-0.5 text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="View edit history"
                    />
                  }
                >
                  <History className="h-3 w-3" />
                </PopoverTrigger>
                <PopoverContent className="w-64 text-xs space-y-2" side="bottom" align="start">
                  <p className="font-medium">Edit history ({editHistory.length})</p>
                  <div className="space-y-1">
                    {editHistory.map((history, index) => (
                      <div key={`${history.at}-${index}`} className="flex items-start justify-between gap-2">
                        <span className="capitalize">Changed from {history.prevStatus}</span>
                        <span className="text-muted-foreground shrink-0">
                          {new Date(history.at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {student.admissionNumber && (
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{student.admissionNumber}</p>
          )}
        </div>
        {/* Phones: four equal status buttons and the note button on one row. */}
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_2.75rem] gap-2 sm:flex sm:shrink-0">
          <StatusButton status="present" current={status} onClick={() => onUpdate(student.id, 'present')} />
          <StatusButton status="absent" current={status} onClick={() => onUpdate(student.id, 'absent')} />
          <StatusButton status="late" current={status} onClick={() => onUpdate(student.id, 'late')} />
          <StatusButton status="excused" current={status} onClick={() => onUpdate(student.id, 'excused')} />
          <button
            type="button"
            onClick={() => setNoteOpen((value) => !value)}
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
      {student.admissionNumber && (
        <p className="text-xs text-muted-foreground truncate sm:hidden">{student.admissionNumber}</p>
      )}
      {noteOpen && (
        <Input
          type="text"
          placeholder="Add a note (optional)..."
          value={note ?? ''}
          onChange={(event) => onNoteChange(student.id, event.target.value)}
          className="text-xs h-8"
        />
      )}
    </div>
  );
}
