'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { VideoCard, VideoFilter } from '@/components/classroom';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import type { VideoFilters } from '@/types';

const DEFAULT_FILTERS: VideoFilters = { isPublished: true };

export default function StudentVideoLibraryPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);

  const { videos, loading, fetchVideos } = useVideoLibrary(DEFAULT_FILTERS);

  const handleFilterChange = useCallback((updated: VideoFilters) => {
    setFilters(updated);
    fetchVideos({ ...updated, isPublished: true });
  }, [fetchVideos]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Library"
        description="Browse lesson recordings and uploaded videos"
      />

      <VideoFilter filters={filters} onChange={handleFilterChange} />

      {videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos found"
          description="No videos match your current filters. Try adjusting the search."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => router.push(`/student/classroom/video/${video.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
