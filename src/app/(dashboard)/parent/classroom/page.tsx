'use client';

import { Video } from 'lucide-react';
import { VideoCard } from '@/components/classroom/VideoCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';

export default function ParentClassroomPage() {
  const { videos, loading } = useVideoLibrary({ isPublished: true });

  const published = videos.filter((v) => v.isPublished);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Recorded Lessons</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse your child&apos;s published classroom recordings.
        </p>
      </div>

      {published.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No recorded lessons"
          description="Published classroom recordings will appear here."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
