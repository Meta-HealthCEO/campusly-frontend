'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BulkBatchFlow } from '@/components/ai-tools/BulkBatchFlow';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paperId: string;
  classId: string;
  className: string;
  onComplete: () => void;
}

const MAX_FILES = 80;

export function PaperBatchMarkingDialog({
  open, onOpenChange, paperId, classId, className, onComplete,
}: Props) {
  const { createBatch, loading } = useTeacherMarkingBatch();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > MAX_FILES) {
      setError(`You can upload at most ${MAX_FILES} images at once.`);
      setFiles([]);
      return;
    }
    setError(null);
    setFiles(picked);
  };

  const handleUpload = async () => {
    const batch = await createBatch(paperId, 'assessment', classId, files);
    if (batch?._id) setBatchId(batch._id);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setFiles([]);
      setError(null);
      setBatchId(null);
      if (batchId) onComplete();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Batch upload — {className}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Photograph every student&apos;s answer pages, upload them all at once.
            AI reads each header, matches to a student, then marks against the memo.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {!batchId ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="paper-batch-files">
                  Images (max {MAX_FILES}) <span className="text-destructive">*</span>
                </Label>
                <input
                  id="paper-batch-files"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full text-sm border rounded-md p-2 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {files.length === 0
                    ? "Drop or pick photos of every student's pages."
                    : `${files.length} file${files.length === 1 ? '' : 's'} selected`}
                </p>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <Button
                onClick={() => void handleUpload()}
                disabled={files.length === 0 || loading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Uploading…' : 'Upload & extract headers'}
              </Button>
            </div>
          ) : (
            <BulkBatchFlow
              batchId={batchId}
              onDone={() => handleClose(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
