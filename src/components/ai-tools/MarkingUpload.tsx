'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageDropzone } from '@/components/ai-tools/ImageDropzone';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';

interface MarkingUploadProps {
  onSubmit: (images: { base64: string; type: string }[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function MarkingUpload({ onSubmit, onBack, isLoading }: MarkingUploadProps) {
  const [files, setFiles] = useState<{ base64: string; type: string }[]>([]);

  const handleFilesChange = useCallback(
    (updated: { base64: string; type: string }[]) => {
      setFiles(updated);
    },
    [],
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Marking paper... this may take 15-60 seconds</p>
          <p className="text-xs text-muted-foreground">
            AI is reading and grading the answers across all pages
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Answer Pages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload up to 8 photos of the student&apos;s answer sheets.
        </p>

        <ImageDropzone
          imagePreview={null}
          onImageSelected={() => {}}
          onClear={() => {}}
          multiple
          onFilesChange={handleFilesChange}
          maxFiles={8}
        />

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => onSubmit(files)}
            disabled={files.length === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Mark this paper
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
