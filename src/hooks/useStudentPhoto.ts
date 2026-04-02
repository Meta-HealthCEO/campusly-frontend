import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';

interface PhotoUploadState {
  uploading: boolean;
  error: string | null;
}

export function useStudentPhoto() {
  const [state, setState] = useState<PhotoUploadState>({
    uploading: false,
    error: null,
  });

  const uploadPhoto = useCallback(async (studentId: string, file: File) => {
    setState({ uploading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiClient.post(`/students/${studentId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrapResponse<{ photoUrl: string }>(res);
      setState({ uploading: false, error: null });
      return data;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to upload photo');
      setState({ uploading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, uploadPhoto };
}
