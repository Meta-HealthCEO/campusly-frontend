'use client';

import { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StudentAvatar } from './StudentAvatar';

interface StudentPhotoUploadProps {
  studentId: string;
  currentPhotoUrl?: string;
  studentName: string;
  onUpload: (studentId: string, file: File) => Promise<unknown>;
  uploading: boolean;
  onSuccess?: () => void;
}

export function StudentPhotoUpload({
  studentId,
  currentPhotoUrl,
  studentName,
  onUpload,
  uploading,
  onSuccess,
}: StudentPhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const result = await onUpload(studentId, selectedFile);
    if (result) {
      toast.success('Photo uploaded successfully');
      setPreview(null);
      setSelectedFile(null);
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {preview ? (
        <img
          src={preview}
          alt="Preview"
          className="h-24 w-24 rounded-full object-cover border-2 border-primary"
        />
      ) : (
        <StudentAvatar
          photoUrl={currentPhotoUrl}
          name={studentName}
          size="lg"
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {selectedFile ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleUpload} disabled={uploading}>
            <Upload className="mr-1 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Confirm'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={uploading}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="mr-1 h-4 w-4" />
          {currentPhotoUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>
      )}
    </div>
  );
}
