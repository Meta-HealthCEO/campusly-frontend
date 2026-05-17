import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

/**
 * Student-side mirror of the teacher useLessonExport hook: downloads the
 * student-pack PDF for a lesson the student has been assigned. The backend
 * gates this on the lesson being published + assigned to the student's class;
 * a 404 surfaces as a generic "not available yet" toast.
 */
export function useStudentLessonExport() {
  const [downloading, setDownloading] = useState(false);

  const download = useCallback(async (lessonId: string, filename: string) => {
    setDownloading(true);
    try {
      const res = await apiClient.get(`/student/lessons/${lessonId}/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      saveBlob(blob, filename);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  }, []);

  return { download, downloading };
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
