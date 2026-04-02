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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ProgrammeOption {
  id: string;
  name: string;
  universityName: string;
}

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (programmeId: string, notes?: string) => Promise<void>;
  onUploadDocument: (
    applicationId: string,
    file: File,
    name: string,
    type: string,
  ) => Promise<void>;
  applicationId?: string;
  programmes: ProgrammeOption[];
}

const DOCUMENT_TYPES = [
  { value: 'id_copy', label: 'ID Copy' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'proof_of_payment', label: 'Proof of Payment' },
  { value: 'motivation_letter', label: 'Motivation Letter' },
  { value: 'other', label: 'Other' },
] as const;

export function ApplicationForm({
  open,
  onOpenChange,
  onSubmit,
  onUploadDocument,
  applicationId,
  programmes,
}: ApplicationFormProps) {
  const isUploadMode = Boolean(applicationId);

  // Create application state
  const [programmeId, setProgrammeId] = useState('');
  const [notes, setNotes] = useState('');

  // Upload document state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setProgrammeId('');
    setNotes('');
    setDocName('');
    setDocType('');
    setFile(null);
  }

  async function handleCreateSubmit() {
    if (!programmeId) {
      toast.error('Please select a programme');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(programmeId, notes || undefined);
      toast.success('Application created');
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create application';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadSubmit() {
    if (!applicationId) return;
    if (!docName.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    if (!docType) {
      toast.error('Please select a document type');
      return;
    }
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setSubmitting(true);
    try {
      await onUploadDocument(applicationId, file, docName.trim(), docType);
      toast.success('Document uploaded');
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload document';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {isUploadMode ? 'Upload Documents' : 'New Application'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!isUploadMode ? (
            <>
              {/* Programme select */}
              <div className="space-y-2">
                <Label htmlFor="programme">
                  Programme <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={programmeId}
                  onValueChange={(val: unknown) => setProgrammeId(val as string)}
                >
                  <SelectTrigger className="w-full" id="programme">
                    <SelectValue placeholder="Select a programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.universityName} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(e.target.value)
                  }
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              {/* Document name */}
              <div className="space-y-2">
                <Label htmlFor="docName">
                  Document Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="docName"
                  placeholder="e.g. Matric Certificate"
                  value={docName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDocName(e.target.value)
                  }
                />
              </div>

              {/* Document type */}
              <div className="space-y-2">
                <Label htmlFor="docType">
                  Document Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={docType}
                  onValueChange={(val: unknown) => setDocType(val as string)}
                >
                  <SelectTrigger className="w-full" id="docType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File input */}
              <div className="space-y-2">
                <Label htmlFor="fileUpload">
                  File <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fileUpload"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-xs text-muted-foreground truncate">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={isUploadMode ? handleUploadSubmit : handleCreateSubmit}
            disabled={submitting}
          >
            {submitting
              ? isUploadMode
                ? 'Uploading...'
                : 'Creating...'
              : isUploadMode
                ? 'Upload'
                : 'Create Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
