import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';

export function useLessonExport() {
  const [downloading, setDownloading] = useState<'teacher' | 'student' | null>(null);

  const download = useCallback(async (lessonId: string, mode: 'teacher' | 'student', filename: string) => {
    setDownloading(mode);
    try {
      const res = await apiClient.get(`/lessons/${lessonId}/export/${mode}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }, []);

  return { download, downloading };
}
