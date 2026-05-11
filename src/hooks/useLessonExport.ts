import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';

export function useLessonExport() {
  const [downloading, setDownloading] = useState<'teacher' | 'student' | null>(null);
  const [downloadingSlides, setDownloadingSlides] = useState(false);

  const download = useCallback(async (lessonId: string, mode: 'teacher' | 'student', filename: string) => {
    setDownloading(mode);
    try {
      const res = await apiClient.get(`/lessons/${lessonId}/export/${mode}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      saveBlob(blob, filename);
    } finally {
      setDownloading(null);
    }
  }, []);

  const downloadSlides = useCallback(async (lessonId: string, filename: string) => {
    setDownloadingSlides(true);
    try {
      const res = await apiClient.get(`/lessons/${lessonId}/export/slides`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      saveBlob(blob, filename);
    } finally {
      setDownloadingSlides(false);
    }
  }, []);

  return { download, downloading, downloadSlides, downloadingSlides };
}

// Browser download helper — extracted so the PDF and slideshow paths share
// the same anchor-click trick (createObjectURL + revoke).
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
