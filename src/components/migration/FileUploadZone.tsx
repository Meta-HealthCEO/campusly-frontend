'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMigrationApi } from '@/hooks/useMigrationApi';
import type { SourceSystem } from '@/types/migration';
import { SOURCE_SYSTEM_LABELS } from '@/types/migration';

interface FileUploadZoneProps {
  sourceSystem: SourceSystem;
  onBack: () => void;
}

export function FileUploadZone({ sourceSystem, onBack }: FileUploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const { uploadFile } = useMigrationApi();

  const acceptTypes = sourceSystem === 'excel' ? '.xlsx,.xls' : '.csv';

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    const validExts = sourceSystem === 'excel' ? ['xlsx', 'xls'] : ['csv'];
    if (!validExts.includes(ext) && !['d6_connect', 'karri', 'adam', 'schooltool'].includes(sourceSystem)) {
      toast.error(`Invalid file type. Please upload a ${validExts.join(' or ')} file.`);
      return;
    }
    setFile(f);
  }, [sourceSystem]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file || !user?.schoolId) return;
    setUploading(true);
    try {
      const fileUrl = `https://cdn.campusly.co.za/uploads/migrations/${Date.now()}_${file.name}`;
      await uploadFile({
        schoolId: user.schoolId,
        sourceSystem,
        originalName: file.name,
        fileUrl,
        fileSize: file.size,
      });
      toast.success('File uploaded and migration job created!');
    } catch {
      toast.error('Failed to create migration job');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
        <CardDescription>
          Upload your {SOURCE_SYSTEM_LABELS[sourceSystem]} data file to begin the import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Accepts {sourceSystem === 'excel' ? '.xlsx, .xls' : '.csv'} files
            </p>
            <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
              Browse Files
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={acceptTypes}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              'Upload & Continue'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
