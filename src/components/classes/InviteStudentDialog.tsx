'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getStudentDisplayName } from '@/lib/student-helpers';
import type { StudentPortalCredentials } from '@/hooks/useTeacherClasses';
import type { Student } from '@/types';
import { StudentCredentialsPanel } from './StudentCredentialsPanel';

interface InviteStudentDialogProps {
  student: Student | null;
  onClose: () => void;
  onInvite: (studentId: string, email: string) => Promise<StudentPortalCredentials | void>;
  isLoading: boolean;
}

export function InviteStudentDialog({
  student,
  onClose,
  onInvite,
  isLoading,
}: InviteStudentDialogProps) {
  const [email, setEmail] = useState('');
  const [credentials, setCredentials] = useState<StudentPortalCredentials | null>(null);

  const handleClose = () => {
    setEmail('');
    setCredentials(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!student || !email.trim()) return;
    const result = await onInvite(student.id, email.trim());
    if (result) setCredentials(result);
  };

  const studentFullName = student ? getStudentDisplayName(student).full : '';

  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Invite {studentFullName} to Portal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {credentials && student ? (
            <StudentCredentialsPanel
              credentials={credentials}
              deliveryMode="email"
              studentId={student.id}
              studentName={studentFullName}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          {credentials ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!email.trim() || isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Login Details'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
