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
import { ContactEditTab } from '@/components/students/profile-tabs/ContactEditTab';
import { MedicalEditTab } from '@/components/students/profile-tabs/MedicalEditTab';
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';

interface PendingStudent {
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export type AddStudentPayload = Partial<StudentProfileFormData>;

interface StudentAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStudent: (data: AddStudentPayload) => Promise<void>;
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
  const [form, setForm] = useState<Partial<StudentProfileFormData>>(EMPTY_FORM);
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] as string[] });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCsvText('');
    setCsvErrors([]);
    setProgress({ current: 0, total: 0, errors: [] });
  };

  function handleChange(patch: Partial<StudentProfileFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const submitOne = async (closeOnSuccess: boolean) => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.admissionNumber?.trim()) {
      toast.error('First name, last name, and admission number are required');
      return;
    }
    setSubmitting(true);
    try {
      await onAddStudent(form);
      toast.success(`${form.firstName} ${form.lastName} added`);
      if (closeOnSuccess) {
        resetForm();
        onOpenChange(false);
      } else {
        // Keep dialog open for adding the next student. Reset only the form.
        setForm(EMPTY_FORM);
      }
    } catch (err: unknown) {
      console.error('Failed to add student', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to add student';
      toast.error(msg);
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
      if (parseErrors.length > 0) toast.error('All lines have errors — see details below');
      return;
    }

    setSubmitting(true);
    setProgress({ current: 0, total: parsed.length, errors: [] });
    const importErrors: string[] = [];
    try {
      for (let i = 0; i < parsed.length; i++) {
        try {
          await onAddStudent(parsed[i]);
        } catch {
          importErrors.push(`Failed to add ${parsed[i].firstName} ${parsed[i].lastName}`);
        }
        setProgress(prev => ({ ...prev, current: i + 1, errors: [...importErrors] }));
      }
      const succeeded = parsed.length - importErrors.length;
      const msg = parseErrors.length > 0 || importErrors.length > 0
        ? `${succeeded} student(s) added (${parseErrors.length} skipped, ${importErrors.length} failed)`
        : `${parsed.length} student(s) added from CSV`;
      if (succeeded > 0) toast.success(msg);
      else toast.error('All students failed to import');
      resetForm();
      setCsvErrors([]);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to add CSV students', err);
      toast.error('Failed to add some students');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Students</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="manual">Single — full profile</TabsTrigger>
            <TabsTrigger value="csv">CSV — bulk minimal</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex-1 overflow-y-auto py-2">
            <p className="mb-3 text-xs text-muted-foreground">
              First name, last name, and admission number are required. All other fields are optional and can be filled later.
            </p>
            <Tabs defaultValue="personal">
              <TabsList className="flex-wrap mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="medical">Medical</TabsTrigger>
              </TabsList>
              <TabsContent value="personal">
                <PersonalEditTab form={form} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="contact">
                <ContactEditTab form={form} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="medical">
                <MedicalEditTab form={form} onChange={handleChange} />
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4 gap-2 sm:gap-2">
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
            </DialogFooter>
          </TabsContent>

          <TabsContent value="csv" className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Paste CSV (one student per line: firstName,lastName,admissionNumber)
              </Label>
              <Textarea
                rows={8}
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
            <DialogFooter>
              <Button
                onClick={submitCsv}
                disabled={busy || !csvText.trim()}
              >
                {busy ? 'Adding...' : 'Import'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
