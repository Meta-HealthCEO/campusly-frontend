'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 30;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function pdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Worker module has no public types — cast through unknown to silence tsc
  const workerMod = (await import('pdfjs-dist/legacy/build/pdf.worker.mjs')) as unknown as {
    default?: string;
  };
  pdfjs.GlobalWorkerOptions.workerSrc = (workerMod.default ?? '') as string;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  return doc.numPages;
}

interface Props {
  value: File | null;
  pageCount: number | null;
  onChange: (file: File | null, pageCount: number | null) => void;
}

export function UploadDropzone({ value, pageCount, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!ALLOWED.has(file.type)) {
      setError('Only PDF or image (JPEG, PNG, WebP) files are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be 25 MB or smaller.');
      return;
    }
    let pages = 1;
    if (file.type === 'application/pdf') {
      setAnalyzing(true);
      try {
        pages = await pdfPageCount(file);
      } catch {
        setError('Could not read this PDF. Try re-saving or converting to images.');
        setAnalyzing(false);
        return;
      }
      setAnalyzing(false);
      if (pages > MAX_PAGES) {
        setError(`PDF has ${pages} pages — maximum is ${MAX_PAGES}.`);
        return;
      }
    }
    onChange(file, pages);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'hover:bg-muted',
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drop a PDF or image, or click to choose</p>
        <p className="text-xs text-muted-foreground">PDF up to 30 pages, max 25 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {analyzing && <p className="text-xs text-muted-foreground">Reading PDF…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value && !error && (
        <div className="flex items-center gap-3 rounded-md border p-2">
          {value.type === 'application/pdf'
            ? <FileText className="h-4 w-4" />
            : <ImageIcon className="h-4 w-4" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {(value.size / 1024 / 1024).toFixed(1)} MB · {pageCount ?? 1} page{(pageCount ?? 1) === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onChange(null, null); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
