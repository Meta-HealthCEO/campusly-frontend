'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StudentCredentialsPanel, type StudentCredentials } from './StudentCredentialsPanel';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { writeSlip, clearSlip } from '@/lib/student-slip-storage';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  studentEmail: string;
}

export function RegenerateCredentialsDialog({
  open, onOpenChange, studentId, studentName, studentEmail,
}: Props) {
  const { regenerateCredentials } = useTeacherClasses();
  const school = useSchoolStore((s) => s.school);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<StudentCredentials | null>(null);

  const deliveryMode: 'email' | 'slip' = studentEmail.endsWith('@students.campusly.local')
    ? 'slip'
    : 'email';

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const result = await regenerateCredentials(studentId);
      const creds = result.credentials;
      if (!creds) throw new Error('No credentials returned');
      setCredentials(creds);
      if (deliveryMode === 'slip') {
        writeSlip({
          studentId,
          studentName,
          loginEmail: creds.loginEmail,
          tempPassword: creds.tempPassword,
          schoolName: school?.name ?? 'Your school',
          loginUrl: `${window.location.origin}/auth/login`,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not regenerate credentials';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (credentials) clearSlip(studentId);
    setCredentials(null);
    onOpenChange(false);
  };

  const firstName = studentName.split(' ')[0] || studentName;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Regenerate login credentials?</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!credentials ? (
            <p className="text-sm text-muted-foreground">
              This will invalidate <strong>{studentName}</strong>&apos;s current password and
              generate a new one. {firstName} will be forced to change it on next login.
              {' '}
              {deliveryMode === 'email'
                ? `An email with the new credentials will be sent to ${studentEmail}.`
                : `You'll need to print or share the new slip with ${firstName}.`}
            </p>
          ) : (
            <StudentCredentialsPanel
              credentials={credentials}
              deliveryMode={deliveryMode}
              studentId={studentId}
              studentName={studentName}
              onPrintSlip={deliveryMode === 'slip'
                ? () => window.open(`/teacher/students/${studentId}/credentials/print`, '_blank')
                : undefined}
            />
          )}
        </div>

        <DialogFooter>
          {!credentials ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : 'Regenerate'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
