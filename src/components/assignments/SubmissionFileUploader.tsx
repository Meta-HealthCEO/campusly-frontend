'use client';

import { useState } from 'react';
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useAssignmentFileUpload } from '@/hooks/useAssignmentFileUpload';
import type { UploadedFile } from '@/types/assignments';

export type { UploadedFile };

interface Props {
  files: UploadedFile[];
  onChange: (next: UploadedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const MAX_FILES_DEFAULT = 10;
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.odt,.rtf,.txt,.md,.ppt,.pptx,.xls,.xlsx';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.ceil(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionFileUploader({
  files,
  onChange,
  maxFiles = MAX_FILES_DEFAULT,
  disabled,
}: Props) {
  const { uploadFile } = useAssignmentFileUpload();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const remaining = maxFiles - files.length;
    if (picked.length > remaining) {
      toast.error(`You can upload at most ${maxFiles} files. ${remaining} slot(s) left.`);
      return;
    }
    setUploading(true);
    const next: UploadedFile[] = [...files];
    for (const file of Array.from(picked)) {
      try {
        next.push(await uploadFile(file));
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, `Failed to upload ${file.name}`));
      }
    }
    onChange(next);
    setUploading(false);
  };

  const handleRemove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="submission-files">
          Files ({files.length}/{maxFiles})
        </Label>
        <input
          id="submission-files"
          type="file"
          multiple
          accept={ACCEPTED}
          disabled={disabled || uploading || files.length >= maxFiles}
          onChange={(e) => {
            void handleFiles(e.target.files);
            // Reset so picking the same file again still triggers change.
            e.target.value = '';
          }}
          className="block w-full text-sm border rounded-md p-2 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">
          PDF, images, Word, PowerPoint, Excel, plain text. Max 25 MB each.
        </p>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, idx) => (
            <li
              key={`${f.url}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium truncate hover:underline"
                >
                  {f.filename}
                </a>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatBytes(f.sizeBytes)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(idx)}
                disabled={disabled}
                aria-label="Remove file"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {files.length === 0 && !uploading && (
        <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center">
          <Upload className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
          <p className="text-sm text-muted-foreground">No files attached yet.</p>
        </div>
      )}
    </div>
  );
}
