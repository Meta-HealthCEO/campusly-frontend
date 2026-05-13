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
import { toast } from 'sonner';

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

  const loginUrl = typeof window === 'undefined' ? '/login' : `${window.location.origin}/login`;
  const credentialText = credentials
    ? [
      'Campusly student portal login',
      `Email: ${credentials.loginEmail}`,
      `Temporary password: ${credentials.tempPassword}`,
      `Login: ${loginUrl}`,
    ].join('\n')
    : '';

  const copyCredentials = async () => {
    if (!credentialText) return;
    try {
      await navigator.clipboard.writeText(credentialText);
      toast.success('Login details copied');
    } catch {
      toast.error('Could not copy login details');
    }
  };

  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Invite {student ? getStudentDisplayName(student).full : ''} to Portal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {credentials ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div>
                <p className="font-semibold">Portal login details</p>
                <p className="text-xs text-muted-foreground">
                  Share these with the student or parent. The password is shown here for handover.
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Login email</p>
                <p className="font-medium break-all">{credentials.loginEmail}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Temporary password</p>
                <p className="font-medium">{credentials.tempPassword}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>{credentials.emailSent ? 'Email sent to the login address.' : 'Email was not sent. Use the details above manually.'}</p>
                <p>{credentials.whatsappSent ? 'WhatsApp sent.' : credentials.whatsappSkippedReason}</p>
              </div>
            </div>
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
            <>
              <Button variant="outline" onClick={copyCredentials}>Copy login details</Button>
              <Button onClick={handleClose}>Done</Button>
            </>
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
