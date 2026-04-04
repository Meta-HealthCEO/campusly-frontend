'use client';

import { useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

interface ImageDropzoneProps {
  imagePreview: string | null;
  onImageSelected: (base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp') => void;
  onClear: () => void;
}

export function ImageDropzone({ imagePreview, onImageSelected, onClear }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const processFile = useCallback((file: File) => {
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the base64 portion (strip data:image/xxx;base64, prefix)
      const base64 = result.split(',')[1];
      if (base64) {
        onImageSelected(base64, file.type as 'image/jpeg' | 'image/png' | 'image/webp');
      }
    };
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  if (imagePreview) {
    return (
      <div className="relative">
        <img
          src={`data:image/jpeg;base64,${imagePreview}`}
          alt="Student answer sheet"
          className="w-full max-h-96 object-contain rounded-lg border"
        />
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
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
