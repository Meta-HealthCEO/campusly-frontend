'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoPlayer } from '@/components/classroom/VideoPlayer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useVideoLibrary } from '@/hooks/useVideoLibrary';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';

export default function StudentVideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = typeof params.id === 'string' ? params.id : '';

  const { videos, loading, fetchVideos } = useVideoLibrary();
  const { progress, saveProgress } = useVideoPlayer();

  useEffect(() => {
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const video = useMemo(
    () => videos.find((v) => v.id === videoId) ?? null,
    [videos, videoId],
  );

  const handleProgress = useCallback(
    (watchedSeconds: number) => {
      const total = video?.durationSeconds ?? 0;
      if (total > 0) {
        saveProgress(videoId, watchedSeconds, total);
      }
    },
    [video, videoId, saveProgress],
  );

  if (loading) return <LoadingSpinner />;

  if (!video) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Video not found"
        description="This video may have been removed or you do not have access."
      />
    );
  }

  const teacherName = `${video.teacherId.firstName} ${video.teacherId.lastName}`;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold truncate">{video.title}</h1>
      </div>

      <VideoPlayer
        video={video}
        progress={progress ?? undefined}
        onProgress={handleProgress}
      />

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {video.subjectId && (
            <Badge variant="secondary">{video.subjectId.name}</Badge>
          )}
          {video.gradeId && (
            <Badge variant="outline">{video.gradeId.name}</Badge>
          )}
          {video.classId && (
            <Badge variant="outline">{video.classId.name}</Badge>
          )}
          {video.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Uploaded by <span className="font-medium text-foreground">{teacherName}</span>
        </p>

        {video.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {video.description}
          </p>
        )}

        {progress && (
          <div className="text-xs text-muted-foreground">
            {progress.isCompleted
              ? 'You have completed this video.'
              : `Progress: ${Math.round(progress.progressPercent)}%`}
          </div>
        )}
      </div>
    </div>
  );
}
