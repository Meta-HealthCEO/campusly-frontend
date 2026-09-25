'use client';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getStudentDisplayName, isPortalStudent } from '@/lib/student-helpers';
import { isInAnotherGroup, removeFromGroupCopy } from '@/lib/roster-removal';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import type { Student } from '@/types';

interface RemoveFromGroupDialogProps {
  /** The learner being removed; null keeps the dialog closed. */
  student: Student | null;
  classId: string;
  groupName: string;
  /** The teacher's groups, already loaded: tells whether the learner is in another one. */
  groups: TeacherClassEntry[];
  learnerLabel: string;
  onClose: () => void;
  /** Rejects to keep the dialog open (the caller shows the error). */
  onConfirm: (student: Student) => Promise<void>;
}

/** Asks before taking a learner out of this group, and says what happens to them. */
export function RemoveFromGroupDialog({
  student, classId, groupName, groups, learnerLabel, onClose, onConfirm,
}: RemoveFromGroupDialogProps) {
  if (!student) return null;
  const copy = removeFromGroupCopy({
    name: getStudentDisplayName(student).full,
    groupName,
    learnerLabel,
    inOtherGroups: isInAnotherGroup(groups, student.id, classId),
    hasLogin: isPortalStudent(student),
  });
  return (
    <ConfirmDialog
      open
      onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      onConfirm={() => onConfirm(student)}
    />
  );
}
