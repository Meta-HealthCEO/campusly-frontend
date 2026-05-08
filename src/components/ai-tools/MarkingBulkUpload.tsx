'use client';

import { useState } from 'react';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';

interface Props {
  onCreated: (batchId: string) => void;
}

const MAX_FILES = 80;

export function MarkingBulkUpload({ onCreated }: Props) {
  const { createBatch, loading } = useTeacherMarkingBatch();
  const { papers } = useTeacherPapers();
  const { classes } = useTeacherClasses();
  const [paperId, setPaperId] = useState('');
  const [classId, setClassId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (): Promise<void> => {
    const batch = await createBatch(paperId, 'assessment', classId, files);
    if (batch?._id) onCreated(batch._id);
  };

  const canSubmit = Boolean(paperId) && Boolean(classId) && files.length > 0 && !loading;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="bulk-paper">
          Paper <span className="text-destructive">*</span>
        </Label>
        <Select onValueChange={(v: unknown) => setPaperId(v as string)} value={paperId}>
          <SelectTrigger id="bulk-paper" className="w-full">
            <SelectValue placeholder="Select paper" />
          </SelectTrigger>
          <SelectContent>
            {papers
              .filter((p) => p.status !== 'archived')
              .map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bulk-class">
          Class <span className="text-destructive">*</span>
        </Label>
        <Select onValueChange={(v: unknown) => setClassId(v as string)} value={classId}>
          <SelectTrigger id="bulk-class" className="w-full">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bulk-files">
          Images (max {MAX_FILES}) <span className="text-destructive">*</span>
        </Label>
        <input
          id="bulk-files"
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

      <Button onClick={() => void handleSubmit()} disabled={!canSubmit} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {loading ? 'Uploading...' : 'Upload & Extract Headers'}
      </Button>
    </div>
  );
}
