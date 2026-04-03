'use client';

import { useEffect, useRef, useState } from 'react';
import type { VideoLesson, VideoProgress } from '@/types';
import { WatchProgressBar } from './WatchProgressBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VideoPlayerProps {
  video: VideoLesson;
  progress?: VideoProgress;
  onProgress?: (watchedSeconds: number) => void;
}

const PLAYBACK_SPEEDS = ['0.5', '0.75', '1', '1.25', '1.5', '2'];

function getEmbedUrl(video: VideoLesson): string {
  if (video.videoType === 'youtube') {
    const match = video.videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/,
    );
    const id = match?.[1] ?? '';
    return `https://www.youtube.com/embed/${id}?rel=0`;
  }
  if (video.videoType === 'vimeo') {
    const match = video.videoUrl.match(/vimeo\.com\/(\d+)/);
    const id = match?.[1] ?? '';
    return `https://player.vimeo.com/video/${id}`;
  }
  return video.videoUrl;
}

export function VideoPlayer({ video, progress, onProgress }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState('1');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isEmbed =
    video.videoType === 'youtube' || video.videoType === 'vimeo';

  // Resume from last position for native video
  useEffect(() => {
    if (!isEmbed && videoRef.current && progress?.watchedSeconds) {
      videoRef.current.currentTime = progress.watchedSeconds;
    }
  }, [isEmbed, progress?.watchedSeconds]);

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(speed);
    }
  }, [speed]);

  // Report progress every 5 seconds
  useEffect(() => {
    if (isEmbed || !onProgress) return;
    intervalRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        onProgress(Math.floor(videoRef.current.currentTime));
      }
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isEmbed, onProgress]);

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-video">
        {isEmbed ? (
          <iframe
            src={getEmbedUrl(video)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <video
            ref={videoRef}
            src={video.videoUrl}
            controls
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>

      {!isEmbed && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Speed:</span>
          <Select value={speed} onValueChange={setSpeed}>
            <SelectTrigger className="w-full sm:w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_SPEEDS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <WatchProgressBar progress={progress ?? null} />
    </div>
  );
}
