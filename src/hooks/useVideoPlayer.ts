import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { VideoProgress } from '@/types';

export function useVideoPlayer() {
  const [progress, setProgress] = useState<VideoProgress | null>(null);

  const saveProgress = async (
    videoId: string,
    watchedSeconds: number,
    totalSeconds: number,
  ): Promise<void> => {
    try {
      const response = await apiClient.patch(`/classroom/videos/${videoId}/progress`, {
        watchedSeconds,
        totalSeconds,
      });
      const raw = response.data.data ?? response.data;
      setProgress(raw as VideoProgress);
    } catch (err: unknown) {
      console.error('Failed to save video progress', err);
    }
  };

  return { progress, saveProgress };
}
