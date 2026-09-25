'use client';

import Link from 'next/link';
import { KeyRound, Mail, Pencil, Trash2 } from 'lucide-react';
import { teacherLearnerProfilePath } from '@/lib/learner-profile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStudentDisplayName } from '@/lib/student-helpers';
import { getInitials } from '@/lib/utils';
import type { Student } from '@/types';
import { LogBehaviourButton } from '@/components/behaviour/LogBehaviourButton';

export interface RegenTarget {
  id: string;
  name: string;
  email: string;
}

interface RosterStudentRowProps {
  student: Student;
  index: number;
  learnerLabel: string;
  isPortal: boolean;
  inviting: boolean;
  onEditProfile: (studentId: string) => void;
  onInvite: (student: Student) => void;
  onRegenerate: (target: RegenTarget) => void;
  onRemove: (studentId: string) => void;
}

/** One learner row in the class roster: identity, portal badge, actions. */
export function RosterStudentRow({
  student, index, learnerLabel, isPortal, inviting,
  onEditProfile, onInvite, onRegenerate, onRemove,
}: RosterStudentRowProps) {
  const { first, last } = getStudentDisplayName(student);
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {getInitials(first, last)}
        </div>
        <Link href={teacherLearnerProfilePath(student.id)} className="min-w-0 flex-1 rounded-md underline-offset-2 hover:underline focus-visible:outline-2">
          <p className="text-sm font-medium truncate">{first} {last}</p>
          <p className="text-xs text-muted-foreground truncate">{student.admissionNumber}</p>
        </Link>
        <span className="shrink-0 text-xs text-muted-foreground">#{index + 1}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
        <LogBehaviourButton learner={{ id: student.id, name: `${first} ${last}`.trim() }} source="roster" />
        {isPortal ? (
          <Badge variant="default" className="shrink-0">Portal</Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">Roster</Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditProfile(student.id)}
          aria-label="Edit student profile"
          className="shrink-0"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {!isPortal && (
          <Button
            variant="ghost"
            size="sm"
            disabled={inviting}
            onClick={() => onInvite(student)}
            aria-label={`Invite ${learnerLabel.toLowerCase()} to portal`}
            className="shrink-0"
          >
            <Mail className="h-4 w-4" />
          </Button>
        )}
        {isPortal && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRegenerate({
              id: student.id,
              name: getStudentDisplayName(student).full,
              email: student.user?.email ?? '',
            })}
            aria-label="Regenerate credentials"
            title="Regenerate credentials"
            className="shrink-0"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(student.id)}
          aria-label={`Remove ${learnerLabel.toLowerCase()}`}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
