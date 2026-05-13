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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PersonalEditTab } from '@/components/students/profile-tabs/PersonalEditTab';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';
import type { AddStudentResult, StudentPortalCredentials } from '@/hooks/useTeacherClasses';

interface PendingStudent {
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export type AddStudentPayload = Partial<StudentProfileFormData>;
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

function normaliseStudentPayload(form: Partial<StudentProfileFormData>): AddStudentPayload {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(form)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;

      payload[key] = key === 'dateOfBirth' && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? new Date(`${trimmed}T00:00:00.000Z`).toISOString()
        : trimmed;
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) payload[key] = value;
      continue;
    }

    if (value !== undefined && value !== null) {
      payload[key] = value;
    }
  }

  return payload as AddStudentPayload;
}

export function StudentAddDialog({
  open,
  onOpenChange,
  onAddStudent,
  isLoading,
}: StudentAddDialogProps) {
  const [form, setForm] = useState<Partial<StudentProfileFormData>>(EMPTY_FORM);
  const [csvText, setCsvText] = useState('');
  const [activeTab, setActiveTab] = useState<StudentAddTab>('manual');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] as string[] });
  const [credentialBatch, setCredentialBatch] = useState<StudentPortalCredentials[]>([]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCsvText('');
    setActiveTab('manual');
    setCsvErrors([]);
    setProgress({ current: 0, total: 0, errors: [] });
    setCredentialBatch([]);
  };

  function handleChange(patch: Partial<StudentProfileFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const submitOne = async (closeOnSuccess: boolean) => {
    const payload = normaliseStudentPayload(form);

    if (!payload.firstName?.trim() || !payload.lastName?.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    setSubmitting(true);
    try {
      const result = await onAddStudent(payload);
      toast.success(`${payload.firstName} ${payload.lastName} added`);
      if (result?.credentials) {
        setCredentialBatch([result.credentials]);
        return;
      }
      if (closeOnSuccess) {
        resetForm();
        onOpenChange(false);
      } else {
        // Keep dialog open for adding the next student. Reset only the form.
        setForm(EMPTY_FORM);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add student'));
    } finally {
      setSubmitting(false);
    }
  };

  const [csvErrors, setCsvErrors] = useState<string[]>([]);

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
      if (parts.length < 3) {
        parseErrors.push(`Line ${i + 1}: expected 3 fields (firstName,lastName,admissionNumber), got ${parts.length}`);
        continue;
      }
      const [firstName, lastName, admissionNumber] = parts;
      if (!firstName || !lastName || !admissionNumber) {
        parseErrors.push(`Line ${i + 1}: all fields must be non-empty`);
        continue;
      }
      parsed.push({ firstName, lastName, admissionNumber });
    }

    setCsvErrors(parseErrors);

    if (parsed.length === 0) {
      if (parseErrors.length > 0) toast.error('All lines have errors - see details below');
      return;
    }

    setSubmitting(true);
    setProgress({ current: 0, total: parsed.length, errors: [] });
    const importErrors: string[] = [];
    const importedCredentials: StudentPortalCredentials[] = [];
    try {
      for (let i = 0; i < parsed.length; i++) {
        try {
          const result = await onAddStudent(parsed[i]);
          if (result?.credentials) importedCredentials.push(result.credentials);
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
      if (importedCredentials.length > 0) {
        setCredentialBatch(importedCredentials);
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
    ? credentialBatch.map((credentials, index) => [
      `Campusly student portal login ${credentialBatch.length > 1 ? index + 1 : ''}`.trim(),
      `Email: ${credentials.loginEmail}`,
      `Temporary password: ${credentials.tempPassword}`,
      `Login: ${loginUrl}`,
    ].join('\n')).join('\n\n')
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
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
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div>
                  <h3 className="text-sm font-semibold">Student portal login details</h3>
                  <p className="text-xs text-muted-foreground">
                    Share these details with the student or parent. Passwords are shown once here.
                  </p>
                </div>
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {credentialBatch.map((credentials) => (
                    <div key={`${credentials.loginEmail}-${credentials.tempPassword}`} className="rounded-md bg-background p-3">
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Login email</p>
                          <p className="font-medium break-all">{credentials.loginEmail}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Temporary password</p>
                          <p className="font-medium">{credentials.tempPassword}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>{credentials.emailSent ? 'Email sent to the login address.' : 'Email was not sent. Use the details above manually.'}</p>
                        <p>{credentials.whatsappSent ? 'WhatsApp sent.' : credentials.whatsappSkippedReason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
            <p className="mb-2 text-xs text-muted-foreground">
              First and last name are required. Admission number is generated automatically if blank. Everything else can be filled later from the student&apos;s profile.
            </p>
            <PersonalEditTab
              form={form}
              onChange={handleChange}
              className="gap-3 lg:grid-cols-3 [&_[data-slot=input]]:h-9 [&_[data-slot=phone-input-shell]]:h-9 [&_[data-slot=select-trigger]]:h-9"
            />
              </>
            )}
          </TabsContent>

          <TabsContent value="csv" className="min-h-0 space-y-4 overflow-visible py-0">
            <div className="space-y-2">
              <Label>
                Paste CSV (one student per line: firstName,lastName,admissionNumber)
              </Label>
              <Textarea
                rows={6}
                placeholder={`John,Doe,ADM001\nJane,Smith,ADM002`}
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); setCsvErrors([]); }}
              />
              {csvErrors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-destructive">
                  {csvErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
            {progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Adding students...</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                {progress.errors.length > 0 && (
                  <p className="text-xs text-destructive">{progress.errors.length} failed</p>
                )}
              </div>
            )}
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
                  setCredentialBatch([]);
                  setForm(EMPTY_FORM);
                }}
              >
                Add another
              </Button>
              <Button
                onClick={() => {
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
