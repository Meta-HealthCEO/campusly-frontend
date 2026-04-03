'use client';

import type { VideoLesson } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Eye, Clock, Video } from 'lucide-react';

interface VideoCardProps {
  video: VideoLesson;
  onClick?: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const typeLabels: Record<string, string> = {
  upload: 'Upload',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  recording: 'Recording',
};

export function VideoCard({ video, onClick }: VideoCardProps) {
  const teacherName = `${video.teacherId.firstName} ${video.teacherId.lastName}`;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Video className="h-10 w-10" />
            <span className="text-xs">No thumbnail</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <div className="rounded-full bg-white/90 p-3">
            <Play className="h-5 w-5 text-primary fill-primary" />
          </div>
        </div>
        {video.durationSeconds !== undefined && (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white font-mono">
            {formatDuration(video.durationSeconds)}
          </span>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        <h4 className="font-medium text-sm leading-snug line-clamp-2">{video.title}</h4>

        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
          <span className="truncate">{teacherName}</span>
          {video.subjectId && (
            <>
              <span>·</span>
              <span className="truncate">{video.subjectId.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {typeLabels[video.videoType] ?? video.videoType}
            </Badge>
            {video.isPublished && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                Published
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{video.viewCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
