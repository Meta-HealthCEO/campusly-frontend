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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PersonalEditTab } from '@/components/students/profile-tabs/PersonalEditTab';
import { extractErrorMessage } from '@/lib/api-helpers';
import { getStudentDisplayName } from '@/lib/student-helpers';
import { writeSlip, clearSlip } from '@/lib/student-slip-storage';
import { useSchoolStore } from '@/stores/useSchoolStore';
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';
import { normaliseStudentPayload } from '@/lib/student-helpers';
import type { AddStudentResult } from '@/hooks/useTeacherClasses';
import { StudentDeliveryModeToggle, type DeliveryMode } from './StudentDeliveryModeToggle';
import { StudentAddCredentialsResults } from './StudentAddCredentialsResults';
import { StudentCsvImportTab } from './StudentCsvImportTab';

interface PendingStudent {
  firstName: string;
  lastName: string;
  admissionNumber?: string;
}

export type AddStudentPayload = Partial<StudentProfileFormData> & {
  deliveryMethod?: DeliveryMode;
};
type StudentAddTab = 'manual' | 'csv';

interface StudentAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStudent: (data: AddStudentPayload) => Promise<AddStudentResult | void>;
  isLoading: boolean;
}

const EMPTY_FORM: Partial<StudentProfileFormData> = {
  firstName: '',
  lastName: '',
  admissionNumber: '',
};

export function StudentAddDialog({
  open,
  onOpenChange,
  onAddStudent,
  isLoading,
}: StudentAddDialogProps) {
  const school = useSchoolStore((s) => s.school);
  const [form, setForm] = useState<Partial<StudentProfileFormData>>(EMPTY_FORM);
  const [csvText, setCsvText] = useState('');
  const [activeTab, setActiveTab] = useState<StudentAddTab>('manual');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('email');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] as string[] });
  const [credentialBatch, setCredentialBatch] = useState<AddStudentResult[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCsvText('');
    setActiveTab('manual');
    setDeliveryMode('email');
    setEmailError(null);
    setCsvErrors([]);
    setProgress({ current: 0, total: 0, errors: [] });
    setCredentialBatch([]);
  };

  const clearGeneratedSlips = () => {
    for (const { student } of credentialBatch) {
      clearSlip(student.id);
    }
  };

  const persistSlipFor = (result: AddStudentResult) => {
    if (!result.credentials) return;
    const { full } = getStudentDisplayName(result.student);
    writeSlip({
      studentId: result.student.id,
      studentName: full,
      loginEmail: result.credentials.loginEmail,
      tempPassword: result.credentials.tempPassword,
      schoolName: school?.name ?? 'Your school',
      loginUrl: typeof window === 'undefined'
        ? '/auth/login'
        : `${window.location.origin}/auth/login`,
    });
  };

  function handleChange(patch: Partial<StudentProfileFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
    if (patch.email !== undefined && emailError) setEmailError(null);
  }

  const submitOne = async (closeOnSuccess: boolean) => {
    const payload = normaliseStudentPayload(form);

    if (!payload.firstName?.trim() || !payload.lastName?.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    if (deliveryMode === 'email' && !payload.email?.toString().trim()) {
      setEmailError('Email is required for email-invite mode');
      toast.error('Email is required when delivery mode is email');
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      const result = await onAddStudent({ ...payload, deliveryMethod: deliveryMode });
      toast.success(`${payload.firstName} ${payload.lastName} added`);
      if (result?.credentials) {
        if (deliveryMode === 'slip') persistSlipFor(result);
        setCredentialBatch([result]);
        return;
      }
      if (closeOnSuccess) {
        resetForm();
        onOpenChange(false);
      } else {
        setForm(EMPTY_FORM);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add student'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCsv = async () => {
    const lines = csvText.split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error('Paste at least one line');
      return;
    }
    const parsed: PendingStudent[] = [];
    const parseErrors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 2 || parts.length > 3) {
        parseErrors.push(`Line ${i + 1}: expected 2 or 3 fields (firstName,lastName,optionalAdmissionNumber), got ${parts.length}`);
        continue;
      }
      const [firstName, lastName, admissionNumber] = parts;
      if (!firstName || !lastName) {
        parseErrors.push(`Line ${i + 1}: first name and last name are required`);
        continue;
      }
      parsed.push({ firstName, lastName, ...(admissionNumber ? { admissionNumber } : {}) });
    }

    setCsvErrors(parseErrors);

    if (parsed.length === 0) {
      if (parseErrors.length > 0) toast.error('All lines have errors - see details below');
      return;
    }

    setSubmitting(true);
    setProgress({ current: 0, total: parsed.length, errors: [] });
    const importErrors: string[] = [];
    const importedResults: AddStudentResult[] = [];
    try {
      for (let i = 0; i < parsed.length; i++) {
        try {
          // The CSV format is firstName,lastName,optionalAdmissionNumber — it
          // carries no email address. Sending deliveryMethod 'email' made the
          // backend's superRefine reject every single row ("Email is required
          // when delivery method is email-invite"), so bulk import failed 100%
          // of the time. Printed slips are the correct channel here.
          const result = await onAddStudent({ ...parsed[i], deliveryMethod: 'slip' });
          if (result?.credentials) importedResults.push(result);
        } catch (err: unknown) {
          importErrors.push(`${parsed[i].firstName} ${parsed[i].lastName}: ${extractErrorMessage(err, 'Failed to add student')}`);
        }
        setProgress(prev => ({ ...prev, current: i + 1, errors: [...importErrors] }));
      }
      const succeeded = parsed.length - importErrors.length;
      const msg = parseErrors.length > 0 || importErrors.length > 0
        ? `${succeeded} student(s) added (${parseErrors.length} skipped, ${importErrors.length} failed)`
        : `${parsed.length} student(s) added from CSV`;
      if (succeeded > 0) toast.success(msg);
      else toast.error('All students failed to import');
      if (importedResults.length > 0) {
        setCredentialBatch(importedResults);
        setActiveTab('manual');
      } else {
        resetForm();
        setCsvErrors([]);
        onOpenChange(false);
      }
    } catch {
      toast.error('Failed to add some students');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;
  const hasCredentials = credentialBatch.length > 0;
  const loginUrl = typeof window === 'undefined' ? '/login' : `${window.location.origin}/login`;
  const credentialText = hasCredentials
    ? credentialBatch.map(({ credentials }, index) => {
        if (!credentials) return '';
        return [
          `Campusly student portal login ${credentialBatch.length > 1 ? index + 1 : ''}`.trim(),
          `Email: ${credentials.loginEmail}`,
          `Temporary password: ${credentials.tempPassword}`,
          `Login: ${loginUrl}`,
        ].join('\n');
      }).filter(Boolean).join('\n\n')
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

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      clearGeneratedSlips();
      resetForm();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-visible sm:max-w-5xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Add Students</DialogTitle>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(value: unknown) => setActiveTab(value as StudentAddTab)}
          className="min-h-[25rem] flex flex-col gap-3"
        >
          <TabsList className="shrink-0">
            <TabsTrigger value="manual">Single - full profile</TabsTrigger>
            <TabsTrigger value="csv">CSV - bulk minimal</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="min-h-0 overflow-visible py-0">
            {hasCredentials ? (
              <StudentAddCredentialsResults batch={credentialBatch} deliveryMode={deliveryMode} />
            ) : (
              <>
                <div className="mb-3">
                  <StudentDeliveryModeToggle value={deliveryMode} onChange={setDeliveryMode} />
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  First and last name are required. Admission number is generated automatically if blank.
                  {deliveryMode === 'email'
                    ? ' Email is required for the email-invite flow.'
                    : ' Email is optional; a synthetic login will be generated.'}
                  {' '}Everything else can be filled later from the student&apos;s profile.
                </p>
                <PersonalEditTab
                  form={form}
                  onChange={handleChange}
                  className="gap-3 lg:grid-cols-3 [&_[data-slot=input]]:h-9 [&_[data-slot=phone-input-shell]]:h-9 [&_[data-slot=select-trigger]]:h-9"
                />
                {emailError && (
                  <p className="mt-2 text-xs text-destructive">{emailError}</p>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="csv" className="min-h-0 space-y-4 overflow-visible py-0">
            <StudentCsvImportTab
              csvText={csvText}
              onCsvTextChange={(value) => { setCsvText(value); setCsvErrors([]); }}
              csvErrors={csvErrors}
              progress={progress}
            />
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-1 gap-2 sm:gap-2">
          {hasCredentials ? (
            <>
              <Button variant="outline" onClick={copyCredentials}>
                Copy login details
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearGeneratedSlips();
                  setCredentialBatch([]);
                  setForm(EMPTY_FORM);
                }}
              >
                Add another
              </Button>
              <Button
                onClick={() => {
                  clearGeneratedSlips();
                  resetForm();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </>
          ) : activeTab === 'manual' ? (
            <>
              <Button
                variant="outline"
                onClick={() => submitOne(false)}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and add another'}
              </Button>
              <Button
                onClick={() => submitOne(true)}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and close'}
              </Button>
            </>
          ) : (
            <Button
              onClick={submitCsv}
              disabled={busy || !csvText.trim()}
            >
              {busy ? 'Adding...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
