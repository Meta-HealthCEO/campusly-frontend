import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { VideoLesson, CreateVideoPayload, VideoFilters } from '@/types';

export function useVideoLibrary(initialFilters?: VideoFilters) {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async (filters?: VideoFilters) => {
    setLoading(true);
    try {
      const params = filters ?? initialFilters ?? {};
      const response = await apiClient.get('/classroom/videos', { params });
      const raw = response.data.data ?? response.data;
      setVideos(Array.isArray(raw) ? raw : raw.data ?? []);
    } catch (err: unknown) {
      console.error('Failed to fetch video library', err);
    } finally {
      setLoading(false);
    }
  };

  const createVideo = async (payload: CreateVideoPayload): Promise<VideoLesson> => {
    const response = await apiClient.post('/classroom/videos', payload);
    return response.data.data ?? response.data;
  };

  const updateVideo = async (
    videoId: string,
    payload: Partial<CreateVideoPayload>,
  ): Promise<VideoLesson> => {
    const response = await apiClient.patch(`/classroom/videos/${videoId}`, payload);
    return response.data.data ?? response.data;
  };

  const deleteVideo = async (videoId: string): Promise<void> => {
    await apiClient.delete(`/classroom/videos/${videoId}`);
  };

  useEffect(() => {
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videos,
    loading,
    fetchVideos,
    createVideo,
    updateVideo,
    deleteVideo,
  };
}
