'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { UploadedFile } from '@/types/assignments';

interface UseAssignmentFileUploadResult {
  uploading: boolean;
  /** Upload one file to the assignment uploads endpoint. Throws on failure. */
  uploadFile: (file: File) => Promise<UploadedFile>;
}

export function useAssignmentFileUpload(): UseAssignmentFileUploadResult {
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post('/assignments/uploads/file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapResponse<UploadedFile>(res);
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, uploadFile };
}
