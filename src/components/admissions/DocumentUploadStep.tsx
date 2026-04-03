'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X } from 'lucide-react';

interface FileState {
  birthCertificate: File | null;
  previousReportCard: File | null;
  proofOfResidence: File | null;
}

interface Props {
  files: FileState;
  onFileChange: (field: keyof FileState, file: File | null) => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = '.pdf,.jpg,.jpeg,.png';

function FileUploadField({
  label,
  required,
  file,
  fieldName,
  onFileChange,
}: {
  label: string;
  required: boolean;
  file: File | null;
  fieldName: keyof FileState;
  onFileChange: (field: keyof FileState, file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_SIZE) {
      alert('File size must be under 10MB');
      return;
    }
    onFileChange(fieldName, selected);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {file ? (
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate flex-1">{file.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {(file.size / 1024 / 1024).toFixed(1)}MB
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFileChange(fieldName, null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="flex items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <div className="text-center">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-1">
              Click to upload (PDF, JPEG, PNG - max 10MB)
            </p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

export function DocumentUploadStep({ files, onFileChange }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Document Upload</h3>
      <p className="text-sm text-muted-foreground">
        Upload the required documents. Accepted formats: PDF, JPEG, PNG. Maximum 10MB per file.
      </p>
      <FileUploadField
        label="Birth Certificate"
        required
        file={files.birthCertificate}
        fieldName="birthCertificate"
        onFileChange={onFileChange}
      />
      <FileUploadField
        label="Previous Report Card"
        required={false}
        file={files.previousReportCard}
        fieldName="previousReportCard"
        onFileChange={onFileChange}
      />
      <FileUploadField
        label="Proof of Residence"
        required
        file={files.proofOfResidence}
        fieldName="proofOfResidence"
        onFileChange={onFileChange}
      />
    </div>
  );
}

export type { FileState };
