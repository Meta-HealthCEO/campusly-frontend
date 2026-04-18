'use client';

import { useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload } from 'lucide-react';

type AcceptedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
const ACCEPTED_TYPES: AcceptedMediaType[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 20;
const DEFAULT_MAX_FILES = 8;

interface MultiFileEntry {
  base64: string;
  type: string;
  name: string;
}

interface ImageDropzoneProps {
  imagePreview: string | null;
  imageType?: AcceptedMediaType;
  onImageSelected: (base64: string, mediaType: AcceptedMediaType) => void;
  onClear: () => void;
  acceptPdf?: boolean;
  multiple?: boolean;
  onFilesChange?: (files: { base64: string; type: string }[]) => void;
  maxFiles?: number;
}

export function ImageDropzone({
  imagePreview,
  imageType = 'image/jpeg',
  onImageSelected,
  onClear,
  acceptPdf = false,
  multiple = false,
  onFilesChange,
  maxFiles = DEFAULT_MAX_FILES,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [multiFiles, setMultiFiles] = useState<MultiFileEntry[]>([]);

  const readFileAsBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (base64) resolve(base64);
        else reject(new Error('Failed to read file'));
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  }, []);

  const processFile = useCallback((file: File) => {
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type as AcceptedMediaType)) {
      setError(acceptPdf ? 'Please upload a JPEG, PNG, WebP image or PDF.' : 'Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        onImageSelected(base64, file.type as AcceptedMediaType);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageSelected, acceptPdf]);

  const processMultipleFiles = useCallback(async (files: File[]) => {
    setError('');

    const validFiles = files.filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type as AcceptedMediaType)) {
        setError(acceptPdf ? 'Some files were skipped — only JPEG, PNG, WebP, or PDF allowed.' : 'Some files were skipped — only JPEG, PNG, or WebP allowed.');
        return false;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Some files were skipped — must be under ${MAX_SIZE_MB}MB each.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setMultiFiles((prev) => {
      const remaining = maxFiles - prev.length;
      if (remaining <= 0) {
        setError(`Maximum of ${maxFiles} files allowed.`);
        return prev;
      }
      return prev; // actual update happens after async reads below
    });

    try {
      const entries = await Promise.all(
        validFiles.map(async (file) => ({
          base64: await readFileAsBase64(file),
          type: file.type,
          name: file.name,
        })),
      );

      setMultiFiles((prev) => {
        const remaining = maxFiles - prev.length;
        if (remaining <= 0) {
          setError(`Maximum of ${maxFiles} files allowed.`);
          return prev;
        }
        const toAdd = entries.slice(0, remaining);
        const updated = [...prev, ...toAdd];
        onFilesChange?.(updated.map((f) => ({ base64: f.base64, type: f.type })));
        return updated;
      });
    } catch (err: unknown) {
      console.error('Failed to process files', err);
      setError('Failed to read one or more files.');
    }
  }, [acceptPdf, maxFiles, readFileAsBase64, onFilesChange]);

  const handleRemoveMultiFile = useCallback((index: number) => {
    setMultiFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesChange?.(updated.map((f) => ({ base64: f.base64, type: f.type })));
      return updated;
    });
  }, [onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (multiple) {
      const files = Array.from(e.dataTransfer.files);
      void processMultipleFiles(files);
    } else {
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    }
  }, [multiple, processFile, processMultipleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (multiple) {
      const files = Array.from(e.target.files ?? []);
      void processMultipleFiles(files);
      // Reset input so the same file can be added again if needed
      e.target.value = '';
    } else {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    }
  }, [multiple, processFile, processMultipleFiles]);

  // --- Single-file mode: original behavior ---
  if (!multiple) {
    if (imagePreview) {
      const isPdf = imageType === 'application/pdf';
      return (
        <div className="relative">
          {isPdf ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-6">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">PDF uploaded</p>
                <p className="text-xs text-muted-foreground">Ready for AI processing</p>
              </div>
            </div>
          ) : (
            <img
              src={`data:${imageType};base64,${imagePreview}`}
              alt="Uploaded document"
              className="w-full max-h-96 object-contain rounded-lg border"
            />
          )}
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div>
        <Card
          className={`border-2 border-dashed cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <div className="rounded-full bg-muted p-4">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop a photo here or click to upload</p>
              <p className="text-sm text-muted-foreground">
                JPEG, PNG, or WebP up to {MAX_SIZE_MB}MB
              </p>
            </div>
            <Button variant="outline" size="sm" type="button">
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </CardContent>
        </Card>
        <input
          ref={inputRef}
          type="file"
          accept={acceptPdf ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"}
          className="hidden"
          onChange={handleInputChange}
        />
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  // --- Multi-file mode ---
  const atMax = multiFiles.length >= maxFiles;

  return (
    <div>
      {!atMax && (
        <Card
          className={`border-2 border-dashed cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <div className="rounded-full bg-muted p-4">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop pages here or click to upload</p>
              <p className="text-sm text-muted-foreground">
                JPEG, PNG, or WebP up to {MAX_SIZE_MB}MB each
              </p>
            </div>
            <Button variant="outline" size="sm" type="button">
              <Upload className="mr-2 h-4 w-4" />
              Add Pages
            </Button>
          </CardContent>
        </Card>
      )}

      {atMax && (
        <div className="rounded-lg border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          Maximum of {maxFiles} pages reached.
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptPdf ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"}
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}

      {multiFiles.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">
            {multiFiles.length} of {maxFiles} pages
          </p>
          <div className="flex gap-2 overflow-x-auto py-2">
            {multiFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative w-20 h-20 rounded border overflow-hidden shrink-0"
              >
                <img
                  src={`data:${file.type};base64,${file.base64}`}
                  alt={`Page ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMultiFile(index)}
                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  aria-label={`Remove page ${index + 1}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <p className="absolute bottom-0 inset-x-0 text-center text-[10px] bg-black/50 text-white py-0.5">
                  Page {index + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
