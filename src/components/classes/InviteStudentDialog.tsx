'use client';

import { useState, useEffect } from 'react';
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
import type { Student } from '@/types';

interface InviteStudentDialogProps {
  student: Student | null;
  onClose: () => void;
  onInvite: (studentId: string, email: string) => Promise<void>;
  isLoading: boolean;
}

export function InviteStudentDialog({
  student,
  onClose,
  onInvite,
  isLoading,
}: InviteStudentDialogProps) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (student) setEmail('');
  }, [student]);

  const handleSubmit = async () => {
    if (!student || !email.trim()) return;
    await onInvite(student.id, email.trim());
  };

  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Invite {student ? getStudentDisplayName(student).full : ''} to Portal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!email.trim() || isLoading}
          >
            {isLoading ? 'Inviting...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
