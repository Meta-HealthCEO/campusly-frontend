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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface PendingStudent {
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface StudentAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStudent: (data: PendingStudent) => Promise<void>;
  isLoading: boolean;
}

export function StudentAddDialog({
  open,
  onOpenChange,
  onAddStudent,
  isLoading,
}: StudentAddDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] as string[] });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setAdmissionNumber('');
    setPendingStudents([]);
    setCsvText('');
    setCsvErrors([]);
    setProgress({ current: 0, total: 0, errors: [] });
  };

  const handleAddToPending = () => {
    if (!firstName.trim() || !lastName.trim() || !admissionNumber.trim()) {
      toast.error('All fields are required');
      return;
    }
    setPendingStudents((prev) => [
      ...prev,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        admissionNumber: admissionNumber.trim(),
      },
    ]);
    setFirstName('');
    setLastName('');
    setAdmissionNumber('');
  };

  const removePending = (index: number) => {
    setPendingStudents((prev) => prev.filter((_, i) => i !== index));
  };

  const submitPending = async () => {
    if (pendingStudents.length === 0) return;
    setSubmitting(true);
    try {
      for (const s of pendingStudents) {
        await onAddStudent(s);
      }
      toast.success(`${pendingStudents.length} student(s) added`);
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to add students', err);
      toast.error('Failed to add some students');
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
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Students</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="csv">CSV Paste</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Admission # <span className="text-destructive">*</span></Label>
                <Input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddToPending}
              className="gap-1"
            >
              <UserPlus className="h-4 w-4" /> Add to list
            </Button>

            {pendingStudents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {pendingStudents.length} student(s) ready
                </p>
                {pendingStudents.map((s, i) => (
                  <div
                    key={`${s.admissionNumber}-${i}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {s.firstName} {s.lastName} ({s.admissionNumber})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePending(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={submitPending}
                disabled={busy || pendingStudents.length === 0}
              >
                {busy ? 'Adding...' : `Done (${pendingStudents.length})`}
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
