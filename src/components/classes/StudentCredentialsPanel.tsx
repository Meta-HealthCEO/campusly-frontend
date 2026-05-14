'use client';

import { Copy, Mail, AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface StudentCredentials {
  loginEmail: string;
  tempPassword: string;
  emailSent: boolean;
  emailError?: string;
}

interface StudentCredentialsPanelProps {
  credentials: StudentCredentials;
  deliveryMode: 'email' | 'slip';
  studentId: string;
  studentName: string;
  onPrintSlip?: () => void;
}

export function StudentCredentialsPanel({
  credentials,
  deliveryMode,
  studentName,
  onPrintSlip,
}: StudentCredentialsPanelProps) {
  const handleCopy = async () => {
    const text = `Login: ${credentials.loginEmail}\nPassword: ${credentials.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Login details copied');
    } catch {
      toast.error('Could not copy — copy manually');
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">{studentName}&apos;s portal login</p>
        <p className="text-xs text-muted-foreground">
          {deliveryMode === 'email'
            ? credentials.emailSent
              ? 'Email sent to the login address.'
              : `Email failed — copy the details below manually${credentials.emailError ? ` (${credentials.emailError})` : ''}.`
            : 'No email sent — share the details below with the student.'}
        </p>
      </div>
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Login:</span>{' '}
          <span className="font-mono">{credentials.loginEmail}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Temporary password:</span>{' '}
          <span className="font-mono">{credentials.tempPassword}</span>
        </div>
      </div>
      {deliveryMode === 'email' && !credentials.emailSent && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Delivery failed. Copy the credentials and share them manually.</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleCopy} className="inline-flex items-center gap-1">
          <Copy className="h-3 w-3" /> Copy login details
        </Button>
        {deliveryMode === 'slip' && onPrintSlip && (
          <Button size="sm" onClick={onPrintSlip} className="inline-flex items-center gap-1">
            <Printer className="h-3 w-3" /> Download printable slip
          </Button>
        )}
        {deliveryMode === 'email' && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground self-center">
            <Mail className="h-3 w-3" /> {credentials.emailSent ? 'Email delivered' : 'Email not delivered'}
          </span>
        )}
      </div>
    </div>
  );
}
