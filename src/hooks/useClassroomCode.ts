import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

interface ClassJoinCodeData {
  classroomCode: string;
  className: string;
}

export function useClassroomCode() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getJoinCode = async (classId: string): Promise<ClassJoinCodeData> => {
    const response = await apiClient.get(`/academic/classes/${classId}/join-code`);
    const data = unwrapResponse(response);
    return data as ClassJoinCodeData;
  };

  const regenerateCode = async (classId: string): Promise<ClassJoinCodeData> => {
    setLoadingId(classId);
    try {
      const response = await apiClient.post(`/academic/classes/${classId}/regenerate-code`);
      const data = unwrapResponse(response);
      return data as ClassJoinCodeData;
    } finally {
      setLoadingId(null);
    }
  };

  return { getJoinCode, regenerateCode, loadingId };
}
