'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Image as ImageIcon } from 'lucide-react';

interface ReceiptUploadProps {
  onUploaded: (url: string) => void;
  uploadFn: (file: File) => Promise<string>;
  existingUrl?: string;
}

export function ReceiptUpload({ onUploaded, uploadFn, existingUrl }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = (name: string) => /\.(jpe?g|png)$/i.test(name);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, or PDF files are allowed');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadFn(file);
      setFileName(file.name);
      setPreviewUrl(isImage(file.name) ? URL.createObjectURL(file) : null);
      onUploaded(url);
    } catch (err: unknown) {
      console.error('Upload failed', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFileName(null);
    setPreviewUrl(null);
    setError(null);
    onUploaded('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleFile}
        className="hidden"
      />

      {!fileName ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" />
          {uploading ? 'Uploading...' : 'Upload Receipt'}
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-md border p-2">
          {previewUrl ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm truncate flex-1">{fileName}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
